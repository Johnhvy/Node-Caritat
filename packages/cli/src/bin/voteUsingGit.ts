#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import voteUsingGit from "@aduh95/caritat/voteUsingGit";
import { cliArgs, getEnv } from "../utils/voteGitEnv.js";

const parsedArgs = await parseArgs().options(cliArgs)
  .argv;

const { repo: repoUrl, branch, path: subPath } = parsedArgs;

await voteUsingGit({
  ...(await getEnv(parsedArgs)),
  repoUrl,
  branch,
  subPath,
  handle: parsedArgs["handle"],
});
