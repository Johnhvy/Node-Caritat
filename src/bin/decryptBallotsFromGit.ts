#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import os from "os";
import { env } from "process";

import parseArgs from "../utils/parseArgs";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import cliArgsForGit from "../utils/cliArgsForGit.js";

import { decryptBallot } from "../crypto/rsa-aes-decrypt.js";
import Vote from "../vote.js";

const parsedArgs = parseArgs().options({
  ...cliArgsForGit,
  key: {
    alias: "k",
    describe: "Path to the private key file",
    demandOption: true,
    normalize: true,
    type: "string",
  },
}).argv;

const { repo: repoUrl, branch, path: subPath } = parsedArgs;

const GIT_BIN = (parsedArgs["git-binary"] ?? env.GIT ?? "git") as string;

const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
const spawnArgs = { cwd };

console.log("Cloning remote repository...");
await runChildProcessAsync(
  GIT_BIN,
  ["clone", "--branch", branch, "--no-tags", "--depth=1", repoUrl, "."],
  { spawnArgs }
);

const vote = new Vote();
vote.loadFromFile(path.join(cwd, subPath, "vote.yml"));
const privateKey = new Uint8Array(); // TODO: get the key from the YAML file

// TODO: check commits signatures?

const decryptPromises = [];
for await (const dirent of await fs.opendir(path.join(cwd, subPath))) {
  if (dirent.isDirectory() || dirent.name === "vote.yml") continue;

  // TODO: check git history for tempering

  const { encryptedSecret, data } = JSON.parse(
    (await fs.readFile(path.join(cwd, subPath, dirent.name), "utf8")).replace(
      /^\uFEFF/,
      ""
    )
  );

  decryptPromises.push(
    decryptBallot(encryptedSecret, data, privateKey).then((data) =>
      vote.addBallotFromBufferSource(data)
    )
  );
}

await Promise.all(decryptPromises);
console.log(vote.getResult());
