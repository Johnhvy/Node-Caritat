#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { env } from "node:process";

import * as yaml from "js-yaml";

import { generateAndSplitKeyPair } from "@node-core/caritat-crypto/generateSplitKeyPair";
import { loadYmlString, templateBallot, VoteFileFormat } from "./parser.js";
import runChildProcessAsync from "./utils/runChildProcessAsync.js";
import type { VoteMethod } from "./vote.js";

interface Options {
  askForConfirmation?: (ballotContent: string) => boolean | Promise<boolean>;

  subject: string;
  headerInstructions?: string;
  candidates: string[];
  canShuffleCandidates?: boolean;
  footerInstructions?: string;

  /** Defaults to "Condorcet" */
  method?: VoteMethod;
  /** Use whatever string is accepted by gpg for its --recipient flag. */
  shareholders: string[];
  shareholdersThreshold: number;
  /** It should match the git commit author. */
  allowedVoters?: string[];

  /**
   * If gitOptions is supplied, it's the subpath relative to the root og the git
   * repository. If no git options is supplied, it's a path in the local FS
   * where to create the vote folder.
   */
  path: string;
  gpgOptions: {
    binaryPath?: string;
    keyServerURL?: string;
    /** Consider using `always` to blindly trust the key server. */
    trustModel: string;
  };

  gitOptions?: {
    binaryPath?: string;
    doNotCleanTempFiles?: boolean;

    /** URL to the git repository. It can be anything accepted by git clone. */
    repo: string;
    /** Branch where the vote commit(s) will be pushed */
    branch: string;

    /** Name of the base branch (e.g. `main`) */
    baseBranch: string;

    forceClone?: boolean;
    commitMessage?: string;
    commitAuthor?: string;
    gpgSign?: boolean | string;
  };
}

export default async function generateNewVoteFolder(options: Options) {
  let directory = path.resolve(options.path);
  const { gitOptions } = options;

  let cwd: string;

  async function cloneInTempFolder(GIT_BIN: string) {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
    const spawnArgs = { cwd };

    console.log("Cloning remote repository...");
    await runChildProcessAsync(
      GIT_BIN,
      [
        "clone",
        "--single-branch",
        "--branch",
        gitOptions.baseBranch,
        "--no-tags",
        "--depth=1",
        gitOptions.repo,
        ".",
      ],
      { spawnArgs }
    );

    directory = path.join(cwd, options.path);
  }
  async function createFolder(directory: string) {
    try {
      const stats = await fs.stat(directory);
      if (!stats.isDirectory())
        throw new Error(`${directory} exists and is not a directory`);
      return Function.prototype;
    } catch (err) {
      if (err?.code === "ENOENT") {
        await fs.mkdir(directory, { recursive: true });
        return () => fs.rm(directory, { recursive: true });
      } else throw err;
    }
  }

  if (gitOptions) {
    const GIT_BIN = gitOptions.binaryPath ?? env.GIT_BIN ?? "git";

    if (gitOptions.forceClone) {
      await cloneInTempFolder(GIT_BIN);
    } else if (!path.isAbsolute(options.path)) {
      const rmDirIfCreatedByUs = await createFolder(directory); // We need to create the folder so the next command doesn't fail.
      try {
        const spawnArgs = { cwd: directory };
        await runChildProcessAsync(GIT_BIN, ["status", "--short"], {
          spawnArgs,
          captureStdout: true,
          captureStderr: true,
        });
      } catch {
        await Promise.all([rmDirIfCreatedByUs(), cloneInTempFolder(GIT_BIN)]);
      }
    } else {
      cwd = directory;
    }
  }

  await createFolder(directory);
  const voteFilePath = path.join(directory, "vote.yml");
  const voteFile = await fs.open(voteFilePath, "wx");

  const GPG_BIN = options.gpgOptions.binaryPath ?? env.GPG_BIN ?? "gpg";

  const shareHolders = options.shareholders;

  const { encryptedPrivateKey, publicKey, shares } =
    await generateAndSplitKeyPair(
      shareHolders.length,
      Number(options.shareholdersThreshold)
    );

  function toArmordedMessage(data: ArrayBuffer) {
    const str = Buffer.from(data).toString("base64");
    const lines = [];
    for (let i = 0; i < str.length; i += 64) {
      lines.push(str.slice(i, i + 64));
    }
    return lines.join("\n");
  }

  const voteConfig: VoteFileFormat = {
    subject: options.subject,
    headerInstructions: options.headerInstructions,
    candidates: options.candidates,
    footerInstructions: options.footerInstructions,
    method: options.method ?? "Condorcet",
    allowedVoters: options.allowedVoters,
    publicKey: `-----BEGIN PUBLIC KEY-----\n${toArmordedMessage(
      publicKey
    )}\n-----END PUBLIC KEY-----\n`,
    encryptedPrivateKey: Buffer.from(encryptedPrivateKey).toString("base64"),
    shares: (
      await Promise.all<string>(
        shares.map(
          (raw, i) =>
            new Promise((resolve, reject) => {
              const gpg = spawn(
                GPG_BIN,
                [
                  "--encrypt",
                  "--armor",
                  ...(options.gpgOptions.keyServerURL
                    ? ["--auto-key-locate", options.gpgOptions.keyServerURL]
                    : []),
                  "--trust-model",
                  options.gpgOptions.trustModel,
                  "--no-encrypt-to",
                  "--recipient",
                  shareHolders[i],
                ],
                { stdio: ["pipe", "pipe", "inherit"] }
              );
              gpg.on("error", reject);
              gpg.stdout
                .toArray()
                .then((chunks: Buffer[]) => {
                  resolve(
                    Buffer.concat(chunks)
                      .toString("ascii")
                      .replaceAll("\r\n", "\n")
                  );
                }, reject);
              gpg.stdin.end(new Uint8Array(raw));
            })
        )
      )
    ).filter(String),
    canShuffleCandidates: options.canShuffleCandidates,
  };
  let yamlString = yaml.dump(voteConfig);
  await voteFile.writeFile(yamlString);
  await voteFile.close();

  const publicKeyPath = path.join(directory, "public.pem");
  const ballotPath = path.join(directory, "ballot.yml");
  let needsConfirmation = true;
  let ballotContent: string;
  while (needsConfirmation) {
    const vote = loadYmlString<VoteFileFormat>(yamlString);

    ballotContent = templateBallot(vote);

    needsConfirmation = await options.askForConfirmation?.(ballotContent);

    if (needsConfirmation) {
      await runChildProcessAsync(
        env?.EDITOR ?? (os.platform() === "win32" ? "notepad" : "vi"),
        [voteFilePath]
      );
      yamlString = await fs.readFile(voteFilePath, "utf-8");
    }
  }

  await fs.writeFile(publicKeyPath, voteConfig.publicKey);
  await fs.writeFile(ballotPath, ballotContent);

  if (gitOptions) {
    const {
      binaryPath,

      repo,
      branch,

      gpgSign,
      commitAuthor,
      commitMessage,
      doNotCleanTempFiles,
    } = gitOptions;
    const spawnArgs = { cwd: directory };

    const GIT_BIN = binaryPath ?? process.env.GIT_BIN ?? "git";

    await runChildProcessAsync(
      GIT_BIN,
      ["add", publicKeyPath, ballotPath, voteFilePath],
      { spawnArgs }
    );

    await runChildProcessAsync(
      GIT_BIN,
      [
        "commit",
        ...(gpgSign === true
          ? ["-S"]
          : typeof gpgSign === "string"
          ? ["-S", gpgSign]
          : []),
        ...(commitAuthor ? ["--author", commitAuthor] : []),
        "-m",
        commitMessage ?? `Initiate vote for "${options.subject}"`,
      ],
      { spawnArgs }
    );

    if (repo) {
      await runChildProcessAsync(GIT_BIN, ["push", repo, `HEAD:${branch}`], {
        spawnArgs,
      });
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
  }
}
