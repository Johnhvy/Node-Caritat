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

const privateKey = parsedArgs.key
  ? await fs.readFile(parsedArgs.key as string)
  : await readStdIn(false);

await countFromGit({
  ...(await getEnv(parseArgs)),
  repoUrl,
  branch,
  subPath,
  privateKey,
  firstCommitSha: parsedArgs.fromCommit,
});
