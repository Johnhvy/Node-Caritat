#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import voteUsingGit, { cliArgs, getEnv } from "../voteUsingGit.js";

const parsedArgs = parseArgs().options(cliArgs as any).argv;

const { repo: repoUrl, branch, path: subPath } = parsedArgs;

await voteUsingGit({
  ...(await getEnv(parsedArgs)),
  repoUrl,
  branch,
  subPath,
  handle: parsedArgs["handle"],
});
