import { parseArgs } from "node:util";
import { execPath, exit } from "node:process";
import { get } from "node:https";
import { open, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface as readLines } from "node:readline";

import readReadme from "../extractInfoFromReadme.js";
import { spawn } from "node:child_process";

const { values: argv } = parseArgs({
  options: {
    remote: {
      type: "string",
      describe:
        "Name or URL to the remote repo. If not provided, SSH pointing to --github-repo-name will be used.",
    },
    ["github-repo-name"]: {
      type: "string",
      describe: "GitHub repository, in the format owner/repo",
      default: "nodejs/TSC",
    },
    "create-pull-request": {
      type: "boolean",
      describe: "Use GitHub API to create a Pull Request. Requires gh CLI tool",
    },
    directory: {
      type: "string",
      short: "d",
      default: "votes",
    },
    "gpg-binary": {
      type: "string",
    },
    ["gpg-sign"]: {
      type: "boolean",
      short: "S",
      describe: "GPG-sign commits.",
    },
    "nodejs-repository-path": {
      type: "string",
      short: "r",
    },
    "tsc-repository-path": {
      type: "string",
      short: "R",
      description:
        "Path to the local nodejs/TSC repository. If not provided, it will be fetched from GitHub",
    },
    subject: {
      type: "string",
      short: "s",
    },
    branch: {
      type: "string",
      short: "b",
      describe: "Name of the branch and subdirectory to use for the tests",
      demandOption: true,
    },
    candidate: {
      type: "string",
      multiple: true,
      short: "c",
    },
    "footer-instructions": {
      type: "string",
      short: "f",
    },
    vote: {
      type: "boolean",
      describe: "Register a vote just after the vote is initialized",
    },
    abstain: {
      type: "boolean",
      describe:
        "Use this flag to create a blank ballot and skip the voting if --vote is provided",
    },
    "do-not-clean": {
      type: "boolean",
      describe: "Use this flag to keep temp files on the local FS",
    },
    help: {
      type: "boolean",
      short: "h",
    },
    version: {
      type: "boolean",
      short: "v",
    },
  },
});

if (argv.help) {
  // TODO parse args subjects
  console.log("Options:");
  console.log(
    "\t--directory (alias -d): Path where to create the new directory."
  );
  console.log(
    "\t--nodejs-repository-path (alias -r): Path to a local clone of " +
      "nodejs/node. If not provided, files will be downloaded from HTTPS."
  );
  console.log(
    "\t--tsc-repository-path (alias -R): Path to a local clone of " +
      "nodejs/TSC. If not provided, it will be cloned from SSH (or HTTPS if " +
      "an HTTPS remote is provided)."
  );
  console.log("\t--subject (alias -s): Subject of vote.");
  exit(0);
}

if (argv.version) {
  const pJson = await readFile(
    new URL("../../package.json", import.meta.url),
    "utf-8"
  );
  console.log(JSON.parse(pJson).version);
  exit(0);
}

if (!argv.branch) {
  throw new Error("You must pass a branch name");
}
if (!argv.subject) {
  throw new Error("You must pass a subject");
}

let input, crlfDelay;
if (argv["nodejs-repository-path"] == null) {
  input = await new Promise((resolve, reject) => {
    // TODO: switch to using fetch when dropping support for Node.js 16.x.
    const req = get(
      "https://raw.githubusercontent.com/nodejs/node/main/README.md",
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error("Wrong status code"));
          // Consume response data to free up memory
          res.resume();
        } else {
          resolve(res);
        }
      }
    );
    req.on("error", reject);
  });
} else {
  const fh = await open(
    join(resolve(argv["nodejs-repository-path"]), "README.md"),
    "r"
  );
  input = fh.createReadStream();
  crlfDelay = Infinity;
}

const tscMembersArray = [];
for await (const member of readReadme(readLines({ input, crlfDelay }))) {
  tscMembersArray.push(member);
}

input.destroy?.();

function* passCLIOptions(...args) {
  for (const arg of args.filter(Object.prototype.hasOwnProperty, argv)) {
    if (Array.isArray(argv[arg])) {
      for (const value of argv[arg]) {
        yield `--${arg}`;
        if (value !== true) yield value;
      }
    } else {
      yield `--${arg}`;
      if (argv[arg] !== true) yield argv[arg];
    }
  }
}
const headerInstructions = `Please set a score to proposal according to your preferences.
You should set the highest score to your favorite option.
Negative scores are allowed, only the order matters.
You can tied two or more proposals if you have no preference.
To abstain, keep all the propositions tied.`;

spawn(
  execPath,
  [
    // TODO: fix path
    "./packages/core/dist/src/bin/generateNewVoteFolder.js",
    ...passCLIOptions(
      "abstain",
      "branch",
      "candidate",
      "footer-instructions",
      "gpg-binary",
      "gpg-sign",
      "subject",
      "vote",
      "do-not-clean"
    ),
    "--repo",
    argv.remote ?? `git@github.com:${argv["github-repo-name"]}.git`,
    ...(argv["tsc-repository-path"]
      ? [
          "--directory",
          join(argv["tsc-repository-path"], argv.directory, argv.branch),
        ]
      : ["--force-clone", "--directory", join(argv.directory, argv.branch)]),
    "--gpg-key-server-url",
    "hkps://keys.openpgp.org",
    ...tscMembersArray.flatMap(({ email }) => ["--shareholder", email]),
    "--shareholders-threshold",
    2,
    //Math.ceil(tscMembersArray.length / 4),
    ...tscMembersArray.flatMap((voter) => [
      "--allowed-voter",
      `${voter.name} <${voter.email}>`,
    ]),
    "--header-instructions",
    headerInstructions,
  ],
  {
    stdio: "inherit",
  }
).on("exit", (code) => {
  if (code !== 0 || !argv["create-pull-request"]) exit(code);

  spawn(
    "gh",
    [
      "api",
      `repos/${argv["github-repo-name"]}/pulls`,
      "-F",
      "base=main",
      "-F",
      "head",
      argv.branch,
      "-F",
      "title",
      argv.subject,
      "-F",
      "body",
      `The following users are invited to participate in this vote:

${tscMembersArray.map(({ handle }) => `- @${handle}`).join("\n")}

Vote instructions will follow.`,
      "--jq '.number'",
    ],
    { stdio: "inherit" }
  ).on("exit", exit);
});
