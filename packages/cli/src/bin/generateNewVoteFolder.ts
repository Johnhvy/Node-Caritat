import { once } from "node:events";
import { stdin, stdout } from "node:process";

import type { VoteMethod } from "@node-core/caritat/vote.js";
import generateNewVoteFolder from "@node-core/caritat/generateNewVoteFolder";
import parseArgs from "../utils/parseArgs.js";
import { getEnv, cliArgs } from "../utils/voteGitEnv.js";

const parsedArgs = await parseArgs().options({
  ...cliArgs,
  handle: undefined,
  editor: undefined,

  repo: {
    ...cliArgs.repo,
    describe:
      "URL of the repository or name of the remote where to push the init commit",
    demandOption: false,
  },
  branch: {
    ...cliArgs.branch,
    default: undefined,
  },
  base: {
    describe: "git branch name",
    default: "main" as const,
    string: true as const,
  },
  "gpg-binary": {
    describe: "Path to the gpg binary (when not provided, looks in the $PATH)",
    normalize: true,
    string: true,
  },
  ["gpg-key-server-url"]: {
    describe:
      "If supplied, indicates where to find the public keys for share holders if they are not available locally",
    string: true,
  },
  ["gpg-trust-model"]: {
    describe:
      "Set what trust model GnuPG should follow. See GPG documentation for more information.",
    default: "always",
    string: true,
  },
  method: {
    describe: "Vote method to use. Defaults to Condorcet.",
    string: true,
  },
  shareholder: {
    describe:
      "A shareholder, for who a key part will be generated and PGP-encrypted. You can specify any number of shareholders.",
    string: true,
    array: true,
  },
  ["shareholders-threshold"]: {
    describe:
      "Minimal number of shareholders required to reconstruct the vote private key. Defaults to 1.",
    number: true,
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
}).argv;

async function getCommitAuthor() {
  if (
    (parsedArgs.username && !parsedArgs.email) ||
    (!parsedArgs.username && parsedArgs.email)
  ) {
    const { emailAddress, username } = await getEnv(parsedArgs);
    return `${username} <${emailAddress}>`;
  }
  if (parsedArgs.username && parsedArgs.email) {
    const { email: emailAddress, username } = parsedArgs;
    return `${username} <${emailAddress}>`;
  }
}

await generateNewVoteFolder({
  async askForConfirmation(ballotContent) {
    console.log("Here's how a ballot will look like:\n\n");
    console.log(ballotContent);
    stdout.write("\nIs it ready to commit? [Y/n] ");
    stdin.resume();
    const chars = await once(stdin, "data");
    stdin.pause();
    if (
      chars[0][0] === 0x6e || // n
      chars[0][0] === 0x4e // N
    ) {
      console.log("Vote template file is ready for edit.");
      return true;
    } else return false;
  },
  allowedVoters: parsedArgs["allowed-voter"],
  candidates: parsedArgs.candidate,
  gpgOptions: {
    binaryPath: parsedArgs["gpg-binary"],
    keyServerURL: parsedArgs["gpg-key-server-url"],
    trustModel: parsedArgs["gpg-trust-model"],
  },
  path: parsedArgs.path,
  shareholders: parsedArgs.shareholder,
  shareholdersThreshold: parsedArgs["shareholders-threshold"],
  subject: parsedArgs.subject,
  footerInstructions: parsedArgs["footer-instructions"],
  headerInstructions: parsedArgs["header-instructions"],
  method: parsedArgs.method as VoteMethod,
  gitOptions: parsedArgs["disable-git"]
    ? undefined
    : {
        repo: parsedArgs.repo,
        branch: parsedArgs.branch,
        baseBranch: parsedArgs.base,
        commitMessage: parsedArgs["git-commit-message"],
        gpgSign: parsedArgs["gpg-sign"],
        forceClone: parsedArgs["force-clone"],
        doNotCleanTempFiles: parsedArgs["do-not-clean"],
        commitAuthor: await getCommitAuthor(),
      },
});
