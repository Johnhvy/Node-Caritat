import { spawn } from "node:child_process";
import { open, readFile } from "node:fs/promises";
import { get } from "node:https";
import { join, resolve } from "node:path";
import { exit } from "node:process";
import { createInterface as readLines } from "node:readline";
import { parseArgs } from "node:util";

// @ts-ignore
import generateNewVoteFolder from "@aduh95/caritat/generateNewVoteFolder";

import readReadme from "../extractInfoFromReadme.js";
import { once } from "node:events";

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
  console.log("Mandatory flags:");
  console.log(
    "\t--branch (alias -b): A name for the vote to take place. It will also be used for naming the subfolder."
  );
  console.log("\t--subject (alias -s): Subject of vote.");
  console.log("Node.js specific options:");
  console.log(
    "\t--nodejs-repository-path (alias -r): Path to a local clone of " +
      "nodejs/node. If not provided, files will be downloaded from HTTPS."
  );
  console.log(
    "\t--tsc-repository-path (alias -R): Path to a local clone of " +
      "nodejs/TSC. If not provided, it will be cloned from SSH (or HTTPS if " +
      "an HTTPS remote is provided)."
  );
  console.log(
    "\t--directory (alias -d): Path relative to the git repo root folder where votes are stored. Default to votes."
  );
  console.log(
    "\t--github-repo-name: GitHub repository, in the format owner/repo. Default is nodejs/TSC."
  );
  console.log("\t--remote: Default is git@github.com:nodejs/TSC.git.");
  await generateNewVoteFolder(["--help"], null);
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
const shareholderThreshold = 2; // Math.ceil(tscMembersArray.length / 4);
const headerInstructions = `Please set a score to proposal according to your preferences.
You should set the highest score to your favorite option.
Negative scores are allowed, only the order matters.
You can tied two or more proposals if you have no preference.
To abstain, keep all the propositions tied.`;

// TODO : clean this 

await generateNewVoteFolder(
  [
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
    shareholderThreshold,
    ...tscMembersArray.flatMap((voter) => [
      "--allowed-voter",
      `${voter.name} <${voter.email}>`,
    ]),
    "--header-instructions",
    headerInstructions,
  ],
  {"GIT-BIN" : "git"}
);

if (argv["create-pull-request"]) {
  const cp = spawn(
    "gh",
    [
      "api",
      `repos/${argv["github-repo-name"]}/pulls`,
      "-F",
      "base=main",
      "-F",
      `head=${argv.branch}`,
      "-F",
      `title=${argv.subject}`,
      "-F",
      `body=The following users are invited to participate in this vote:

${tscMembersArray
  .map(({ name, handle }) => `- ${name} @${handle} (TSC)`)
  .join("\n")}

To close the vote, a minimum of ${shareholderThreshold} key parts would need to be revealed.

Vote instructions will follow.`,
      "--jq",
      ".url",
    ],
    { stdio: ["inherit", "pipe", "inherit"] }
  );
  // @ts-ignore toArray does exist!
  const out = cp.stdout.toArray();
  const [code] = await once(cp, "exit");
  if (code !== 0) exit(code);

  const prUrl = Buffer.concat(await out).toString();

  {
    const cp = spawn(
      "gh",
      [
        "pr",
        "edit",
        prUrl,
        "--body",
        `
TODO
        `,
        "--silent",
      ],
      { stdio: "inherit" }
    );

    const [code] = await once(cp, "exit");
    if (code !== 0) exit(code);
  }

  console.log("PR created", prUrl);
}
