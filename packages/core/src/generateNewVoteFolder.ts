#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { stdin, stdout } from "node:process";
import { loadYmlString, templateBallot, VoteFileFormat } from "./parser.js";
 
import * as yaml from "js-yaml";

// @ts-ignore
import { generateAndSplitKeyPair } from "@aduh95/caritat-crypto/generateSplitKeyPair";
import runChildProcessAsync from "./utils/runChildProcessAsync.js";
import { voteAndCommit } from "./voteUsingGit.js";

export default async function generateNewVoteFolder(parsedArgs) {
  let directory = path.resolve(parsedArgs.directory);
  let subPath = parsedArgs.directory;

  let env, cwd: string;

  async function cloneInTempFolder(GIT_BIN) {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
    const spawnArgs = { cwd };

    console.log("Cloning remote repository...");
    await runChildProcessAsync(
      GIT_BIN,
      [
        "clone",
        "--single-branch",
        "--branch",
        parsedArgs.base,
        "--no-tags",
        "--depth=1",
        parsedArgs.repo,
        ".",
      ],
      { spawnArgs }
    );

    directory = path.join(cwd, parsedArgs.directory);
  }
  async function createFolder(directory: string) {
    try {
      const stats = await fs.stat(directory);
      if (!stats.isDirectory())
        throw new Error(`${directory} exists and is not a directory`);
    } catch (err) {
      if (err?.code === "ENOENT") {
        await fs.mkdir(directory, { recursive: true });
      } else throw err;
    }
  }

  if (!parsedArgs["disable-git"]) {
    const { GIT_BIN } = env;

    if (parsedArgs["force-clone"]) {
      await cloneInTempFolder(GIT_BIN);
    } else if (!path.isAbsolute(parsedArgs.directory)) {
      await createFolder(directory); // We need to create the folder so the next command doesn't fail.
      try {
        const spawnArgs = { cwd: directory };
        await runChildProcessAsync(GIT_BIN, ["status", "--short"], {
          spawnArgs,
          captureStdout: true,
          captureStderr: true,
        });
      } catch {
        await Promise.all([
          fs.rm(directory, { recursive: true }),
          cloneInTempFolder(GIT_BIN),
        ]);
      }
    } else {
      cwd = directory;
      subPath = ".";
    }
  }

  await createFolder(directory);
  const voteFilePath = path.join(directory, "vote.yml");
  const voteFile = await fs.open(voteFilePath, "wx");

  const GPG_BIN = parsedArgs["gpg-binary"] ?? process.env.GPG_BIN ?? "gpg";

  const shareHolders = parsedArgs["shareholder"];

  const { encryptedPrivateKey, publicKey, shares } =
    await generateAndSplitKeyPair(
      shareHolders.length,
      Number(parsedArgs["shareholders-threshold"])
    );

  function toArmordedMessage(data: ArrayBuffer) {
    const str = Buffer.from(data).toString("base64");
    const lines = [];
    for (let i = 0; i < str.length; i += 64) {
      lines.push(str.slice(i, i + 64));
    }
    return lines.join("\n");
  }

  const ballot = {
    subject: parsedArgs.subject,
    headerInstructions: parsedArgs["header-instructions"],
    candidates: parsedArgs.candidate,
    footerInstructions: parsedArgs["footer-instructions"],
    method: parsedArgs.method ?? "Condorcet",
    allowedVoters: parsedArgs["allowed-voter"],
    publicKey: `-----BEGIN PUBLIC KEY-----\n${toArmordedMessage(
      publicKey
    )}\n-----END PUBLIC KEY-----\n`,
    encryptedPrivateKey: Buffer.from(encryptedPrivateKey).toString("base64"),
    shares: (
      await Promise.all<string>(
        shares.map(
          (raw, i) =>
            new Promise((resolve, reject) => {
              const gpg = spawn(GPG_BIN, [
                "--encrypt",
                "--armor",
                ...(parsedArgs["gpg-key-server-url"]
                  ? ["--auto-key-locate", parsedArgs["gpg-key-server-url"]]
                  : []),
                "--trust-model",
                parsedArgs["gpg-trust-model"],
                "--no-encrypt-to",
                "--recipient",
                shareHolders[i],
              ]);
              gpg.on("error", reject);
              gpg.stdin.end(new Uint8Array(raw));
              gpg.stderr.pipe(process.stderr);
              gpg.stdout
                // @ts-ignore
                .toArray()
                .then(
                  (chunks) => resolve(chunks.join("").replaceAll("\r\n", "\n")),
                  reject
                );
            })
        )
      )
    ).filter(String),
  };
  let yamlString = yaml.dump(ballot);
  await voteFile.writeFile(yamlString);
  await voteFile.close();

  const publicKeyPath = path.join(directory, "public.pem");
  const ballotPath = path.join(directory, "ballot.yml");
  let ballotContent;
  while (true) {
    const vote = loadYmlString<VoteFileFormat>(yamlString);

    ballotContent = templateBallot(vote);

    console.log("Here's how a ballot will look like:\n\n");
    console.log(ballotContent);
    stdout.write("\nIs it ready to commit? [Y/n] ");
    stdin.resume();
    let chars = await once(stdin, "data");
    stdin.pause();
    if (
      chars[0][0] === 0x6e || // n
      chars[0][0] === 0x4e // N
    ) {
      console.log("Vote template file is ready for edit.");
      await runChildProcessAsync(
        env?.EDITOR ?? (os.platform() === "win32" ? "notepad" : "vi"),
        [voteFilePath]
      );
      yamlString = await fs.readFile(voteFilePath, "utf-8");
    } else break;
  }

  await fs.writeFile(publicKeyPath, ballot.publicKey);
  await fs.writeFile(ballotPath, ballotContent);

  if (!parsedArgs["disable-git"]) {
    const {
      GIT_BIN,
      signCommits,
      username,
      emailAddress,
      doNotCleanTempFiles,
    } = env;
    const spawnArgs = { cwd: directory };

    await runChildProcessAsync(
      GIT_BIN,
      ["add", publicKeyPath, ballotPath, voteFilePath],
      { spawnArgs }
    );

    const author = `${username} <${emailAddress}>`;
    await runChildProcessAsync(
      GIT_BIN,
      [
        "commit",
        ...(signCommits ? ["-S"] : []),
        `--author`,
        author,
        "-m",
        parsedArgs["git-commit-message"] ??
          `Initiate vote for "${parsedArgs.subject}"`,
      ],
      { spawnArgs }
    );

    if (parsedArgs.vote) {
      await voteAndCommit({
        ...env,
        cwd,
        subPath,
      });
    }

    if (parsedArgs.repo) {
      await runChildProcessAsync(
        GIT_BIN,
        ["push", parsedArgs.repo, `HEAD:${parsedArgs.branch}`],
        { spawnArgs }
      );
    }

    if (cwd != null) {
      if (doNotCleanTempFiles) {
        console.info(
          "The temp folder was not removed from the file system",
          cwd
        );
      } else {
        await fs.rm(cwd, { recursive: true, force: true });
      }
    }
  } else if (parsedArgs.vote) {
    throw new Error(
      "Voting without git has not yet been implemented in this script, please generate the ballot manually or use git"
    );
  }
}
