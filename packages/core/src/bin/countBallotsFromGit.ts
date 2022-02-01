#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import os from "os";
import { env } from "process";

import parseArgs from "../utils/parseArgs.js";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import cliArgsForGit from "../utils/cliArgsForGit.js";

// @ts-ignore
import decryptData from "@aduh95/caritat-crypto/decrypt";
import Vote from "../vote.js";
import readStdIn from "../utils/readStdin.js";

const parsedArgs = parseArgs().options({
  ...cliArgsForGit,
  key: {
    alias: "k",
    describe: "Path to the private key file",
    demandOption: false,
    normalize: true,
    type: "string",
  },
}).argv;

const { repo: repoUrl, branch, path: subPath } = parsedArgs;

const GIT_BIN = (parsedArgs["git-binary"] ?? env.GIT ?? "git") as string;

const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
const spawnArgs = { cwd };

console.error("Cloning remote repository...");
await runChildProcessAsync(
  GIT_BIN,
  ["clone", "--branch", branch, "--no-tags", "--depth=1", repoUrl, "."],
  { spawnArgs }
);

const vote = new Vote();
vote.loadFromFile(path.join(cwd, subPath, "vote.yml"));

const privateKey = parsedArgs.key
  ? await fs.readFile(parsedArgs.key)
  : await readStdIn(false);

// TODO: check commits signatures?

const decryptPromises = [];
for await (const dirent of await fs.opendir(path.join(cwd, subPath))) {
  if (dirent.isDirectory() || !dirent.name.endsWith(".json")) continue;

  console.error("reading", dirent.name, "...");

  // TODO: check git history for tempering

  const { encryptedSecret, data } = JSON.parse(
    (await fs.readFile(path.join(cwd, subPath, dirent.name), "utf8")).replace(
      /^\uFEFF/,
      ""
    )
  );

  decryptPromises.push(
    decryptData(
      Buffer.from(encryptedSecret, "base64"),
      Buffer.from(data, "base64"),
      privateKey
    ).then((data) => vote.addBallotFromBufferSource(data))
  );
}

await Promise.all(decryptPromises);

const result = vote.count();
console.log(vote.generateSummary(privateKey.toString()));
