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
    directory: {
      type: "string",
      short: "d",
    },
    "gpg-binary": {
      type: "string",
    },
    "nodejs-repository-path": {
      type: "string",
      short: "r",
    },
    subject: {
      type: "string",
      short: "s",
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
  console.log("Options:");
  console.log(
    "\t--directory (alias -d): Path where to create the new directory."
  );
  console.log(
    "\t--nodejs-repository-path (alias -r): Path to a local clone of " +
      "nodejs/node. If not provided, files will be downloaded from HTTPS."
  );
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

let input, crlfDelay;
if (argv["nodejs-repository-path"] == null) {
  input = await new Promise((resolve, reject) => {
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

const tscMembersList = await readReadme(readLines({ input, crlfDelay }));
const tscMembersArray = tscMembersList
  .split("\n")
  .map((voter) => voter.replace(/^[-*]\s?/, ""))
  .filter(Boolean);

input.destroy?.();

function* passCLIOptions(...args) {
  for (const arg of args.filter(Object.prototype.hasOwnProperty, argv)) {
    if (Array.isArray(argv[arg])) {
      for (const value of argv[arg]) {
        yield `--${arg}`;
        yield value;
      }
    } else {
      yield `--${arg}`;
      yield argv[arg];
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
    "./packages/core/dist/bin/generateNewVoteFolder.js",
    ...passCLIOptions(
      "directory",
      "gpg-binary",
      "subject",
      "footer-instructions",
      "candidate"
    ),
    "--list-of-shareholders",
    tscMembersList,
    "--threshold",
    Math.ceil(tscMembersArray.length / 4),
    "--header-instructions",
    headerInstructions,
    ...tscMembersArray.flatMap((voter) => ["--allowed-voter", voter]),
  ],
  {
    stdio: "inherit",
  }
).on("exit", (code) => exit(code));
