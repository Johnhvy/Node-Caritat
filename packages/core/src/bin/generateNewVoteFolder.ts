#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import parseArgs from "../utils/parseArgs.js";
import { loadYmlString, templateBallot, VoteFileFormat } from "../parser.js";

import * as yaml from "js-yaml";

// @ts-ignore
import { generateAndSplitKeyPair } from "@aduh95/caritat-crypto/generateSplitKeyPair";
import cliArgsForGit from "../utils/cliArgsForGit.js";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import { getEnv, voteAndCommit } from "../voteUsingGit.js";

const parsedArgs = parseArgs().options({
  ...cliArgsForGit,
  repo: {
    alias: "r",
    describe:
      "URL of the repository or name of the remote where to push the init commit",
    demandOption: false,
    string: true,
  },
  directory: {
    describe:
      "The directory where the vote files should be created. If an absolute path is given, the local git repo will be used unless git was disabled",
    demandOption: true,
    alias: "d",
  },
  "gpg-binary": {
    describe: "Path to the gpg binary (when not provided, looks in the $PATH)",
    normalize: true,
    string: true,
  },
  ["gpg-sign"]: {
    alias: "S",
    describe: "GPG-sign commits.",
  },
  method: {
    describe: "Vote method to use. Defaults to Condorcet.",
    string: true,
  },
  "list-of-shareholders": {
    describe: "List in markdown format of all the shareholders.",
    normalize: true,
    string: true,
  },
  threshold: {
    describe:
      "Minimal number of shareholders required to reconstruct the vote private key. Defaults to 1.",
    string: true,
  },
  subject: {
    describe: "Subject for the vote.",
    string: true,
  },
  "header-instructions": {
    describe: "Instructions to show in the header of the ballot.",
    string: true,
  },
  "footer-instructions": {
    describe: "Instructions to show in the footer of the ballot.",
    string: true,
  },
  candidate: {
    describe:
      "A candidate that voter can vote for. You can specify any number of candidates",
    string: true,
    array: true,
  },
  "allowed-voter": {
    describe: "Name and email of authorized voter, same format as git",
    string: true,
    array: true,
  },
  "git-commit-message": {
    describe: "Custom commit message",
    string: true,
  },
  "disable-git": {
    describe: "Disables the use of git",
    boolean: true,
  },
  "force-clone": {
    describe: "Force the cloning of the remote repository in a temp folder",
    boolean: true,
  },
  vote: {
    describe: "Cast a vote just after the vote is initialized",
    boolean: true,
  },
  abstain: {
    describe:
      "Use this flag to create a blank ballot and skip the voting if --vote is provided",
    type: "boolean",
  },
}).argv;

if (!parsedArgs.directory) {
  throw new Error("You must pass a path for the directory");
}

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
  env = await getEnv(parsedArgs);
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

const shareHolders = [];
const mdListItem = /^\s?[-*]\s?([^<]+) <([^>]+)>\s*$/;
for await (const line of parsedArgs["list-of-shareholders"].split("\n")) {
  if (line === "") continue;

  const match = mdListItem.exec(line);
  if (match === null) {
    throw new Error("Malformed markdown input");
  }
  shareHolders.push({ name: match[1], email: match[2] });
}

const { encryptedPrivateKey, publicKey, shares } =
  await generateAndSplitKeyPair(shareHolders.length, parsedArgs.threshold);

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
              "--auto-key-locate",
              "hkps://keys.openpgp.org",
              "--trust-model",
              "always",
              "-r",
              shareHolders[i].email,
            ]);
            gpg.on("error", reject);
            gpg.stdin.end(raw);
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
const yamlString = yaml.dump(ballot);

const vote = loadYmlString<VoteFileFormat>(yamlString);

const publicKeyPath = path.join(directory, "public.pem");
const ballotPath = path.join(directory, "ballot.yml");

await fs.writeFile(publicKeyPath, ballot.publicKey);
await fs.writeFile(ballotPath, templateBallot(vote));
await voteFile.writeFile(yamlString);
await voteFile.close();

if (!parsedArgs["disable-git"]) {
  const { GIT_BIN, signCommits, username, emailAddress, doNotCleanTempFiles } =
    env;
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
      console.info("The temp folder was not removed from the file system", cwd);
    } else {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  }
} else if (parsedArgs.vote) {
  throw new Error(
    "Voting without git has not yet been implemented in this script, please generate the ballot manually or use git"
  );
}
