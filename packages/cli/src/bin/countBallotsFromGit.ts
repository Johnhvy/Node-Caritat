#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import countFromGit from "@node-core/caritat/countBallotsFromGit";
import fs from "node:fs/promises";
import readStdIn from "../utils/readStdin.js";

import { cliArgs, getEnv } from "../utils/countBallotsGitEnv.js";

const parsedArgs = await parseArgs().options({
  ...cliArgs,
  fromCommit: {
    describe: "sha of the commit initiating the vote",
    string: true,
  },
  summarize: {
    describe: "Format of the vote summary (default is no summary)",
    choices: ["json", "md"],
    string: true,
  },
}).argv;

const { repo: repoURL, branch, path: subPath } = parsedArgs;

const privateKey =
  parsedArgs.key === "-"
    ? await readStdIn(false)
    : parsedArgs.key && (await fs.readFile(parsedArgs.key as string));

const { result, privateKeyAsArmoredString } = await countFromGit({
  ...(await getEnv(parsedArgs)),
  repoURL,
  branch,
  subPath,
  privateKey,
  keyParts: parsedArgs["key-part"],
  firstCommitRef: parsedArgs.fromCommit,
  mailmap: parsedArgs.mailmap,
  commitJsonSummary: null,
});

switch (parsedArgs.summarize) {
  case "json":
    console.log(JSON.stringify(result, null, 2));
    break;

  case "md":
    console.log(result.generateSummary(privateKeyAsArmoredString));
    break;
}
