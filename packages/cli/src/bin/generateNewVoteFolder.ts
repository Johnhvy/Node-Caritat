// @ts-ignore
import generateNewVoteFolder from "@aduh95/caritat/generateNewVoteFolder";
import parseArgs from "../utils/parseArgs.js";
import cliArgsForGit from "../utils/cliArgsForGit.js";
import { getEnv } from "../utils/voteGitEnv.js";
 
const parsedArgs = parseArgs().options({
  ...cliArgsForGit,
  repo: {
    alias: "r",
    describe:
      "URL of the repository or name of the remote where to push the init commit",
    demandOption: false,
    string: true,
  },
  base: {
    type: "string",
    describe: "Name of the base branch",
    default: "main",
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
  ["gpg-key-server-url"]: {
    describe:
      "If supplied, indicates where to find the public keys for share holders if they are not available locally",
  },
  ["gpg-trust-model"]: {
    describe:
      "Set what trust model GnuPG should follow. See GPG documentation for more information.",
    default: "always",
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

let env;
if (!parsedArgs["disable-git"]) {
  env = await getEnv(parsedArgs);
}
await generateNewVoteFolder(parsedArgs, env);
