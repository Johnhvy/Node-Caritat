#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import countFromGit, { cliArgs, getEnv } from "../countBallotsFromGit.js";
import fs from "fs/promises";
import readStdIn from "../utils/readStdin.js";

const parsedArgs = parseArgs().options({
  ...(cliArgs as any),
  fromCommit: {
    describe: "sha of the commit initiating the vote",
    type: "string",
  },
}).argv;

const { repo: repoUrl, branch, path: subPath } = parsedArgs;

const privateKey =
  parsedArgs.key === "-"
    ? await readStdIn(false)
    : parsedArgs.key && (await fs.readFile(parsedArgs.key as string));

console.log(
  await countFromGit({
    ...(await getEnv(parsedArgs)),
    repoUrl,
    branch,
    subPath,
    privateKey,
    firstCommitSha: parsedArgs.fromCommit,
    mailmap: parsedArgs.mailmap,
    decrypt: parsedArgs.decrypt,
  })
);
