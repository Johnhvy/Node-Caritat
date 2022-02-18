#!/usr/bin/env node

// @ts-ignore
import decryptData from "@aduh95/caritat-crypto/decrypt";

import parseArgs from "../utils/parseArgs.js";
import fs from "fs/promises";
import readStdIn from "../utils/readStdin.js";
import cliArgsForGit from "../utils/cliArgsForGit.js";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import streamChildProcessStdout from "../utils/streamChildProcessStdout.js";
import path from "path";
import os from "os";
import { env } from "process";
import {
  BallotFileFormat,
  checkBallot,
  loadYmlFile,
  parseYml,
  VoteFileFormat,
} from "../parser.js";
import Vote, { VoteCommit } from "../vote.js";

async function readFileAtRevision(
  GIT_BIN: string,
  revision: string,
  filePath: string,
  spawnArgs: any
) {
  return await runChildProcessAsync(
    GIT_BIN,
    ["--no-pager", "show", `${revision}:${filePath}`],
    { captureStdout: true, spawnArgs }
  );
}

const cliArgs = {
  ...cliArgsForGit,
  key: {
    alias: "k",
    describe:
      "Path to the private key file (use - to read from stdin). If not provided, the private key will be extracted from the vote.yml file.",
    demandOption: false,
    normalize: true,
    type: "string",
  },
  mailmap: {
    describe: "Path to the mailmap file",
    normalize: true,
    type: "string",
  },
};

async function getEnv(
  parsedArgs: Record<string, unknown>
): Promise<{ GIT_BIN: string; cwd: string }> {
  const GIT_BIN = (parsedArgs["git-binary"] ?? env.GIT ?? "git") as string;

  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
  return {
    GIT_BIN,
    cwd,
  };
}

const parsedArgs = parseArgs().options({
  ...(cliArgs as any),
  fromCommit: {
    describe: "sha of the commit initiating the vote",
    type: "string",
  },
}).argv;

const { repo: repoUrl, branch, path: subPath_ } = parsedArgs;

const subPath = subPath_ as string;

let privateKey =
  parsedArgs.key === "-"
    ? await readStdIn(false)
    : parsedArgs.key && (await fs.readFile(parsedArgs.key as string));

const { GIT_BIN, cwd } = await getEnv(parsedArgs);

const spawnArgs = { cwd };
const firstCommitSha = parsedArgs.fromCommit as string;
const mailmap = parsedArgs.mailmap as string;

console.error("Cloning remote repository...");
await runChildProcessAsync(
  GIT_BIN,
  ["clone", "--branch", branch, "--no-tags", "--single-branch", repoUrl, "."],
  { spawnArgs }
);

const hasVoteFilesBeenTampered = await runChildProcessAsync(
  GIT_BIN,
  [
    "--no-pager",
    "log",
    "--format=%%",
    `${firstCommitSha}..HEAD`,
    "--",
    path.join(subPath, "vote.yml"),
    path.join(subPath, "ballot.yml"),
    path.join(subPath, "public.yml"),
  ],
  { captureStdout: true }
);

if (hasVoteFilesBeenTampered) {
  // TODO: add flag to ignore this exception.
  throw new Error(
    "Some magic files have been tampered with since start of the vote"
  );
}

// const { encryptedPrivateKey } = loadYmlFile<VoteFileFormat>(
//   path.join(cwd, subPath, "vote.yml")
// );
const vote = new Vote();
vote.loadFromFile(path.join(cwd, subPath, "vote.yml"));

if (!privateKey) {
  const encryptedKeyFile = path.join(cwd, "privateKey.enc");
  await fs.writeFile(encryptedKeyFile, vote.voteFileData.encryptedPrivateKey);
  privateKey = Buffer.from(
    await runChildProcessAsync("gpg", ["-d", encryptedKeyFile], {
      captureStdout: true,
    })
  );
}

if (mailmap != null) {
  await fs.cp(mailmap, path.join(cwd, ".mailmap"));
}

const gitLog = streamChildProcessStdout(
  GIT_BIN,
  [
    "--no-pager",
    "log",
    `${firstCommitSha}..HEAD`,
    "--format=///%H %G? %aN <%aE>",
    "--name-only",
  ],
  spawnArgs
);

let currentCommit: VoteCommit;
let td = new TextDecoder();
async function decryptCurrentCommit() {
  if (currentCommit == null) return;

  const reason = vote.reasonToDiscardCommit(currentCommit);
  return new Promise((resolve, reject): void => {
    if (reason == null) {
      const { author } = currentCommit;
      readFileAtRevision(
        GIT_BIN,
        currentCommit.sha,
        currentCommit.files[0],
        spawnArgs
      )
        .then((fileContents) => {
          const { encryptedSecret, data } = JSON.parse(fileContents);
          return decryptData(
            Buffer.from(encryptedSecret, "base64"),
            Buffer.from(data, "base64"),
            privateKey
          );
        })
        .then((data: BufferSource) => {
          const strData = td.decode(data);
          //   console.log(strData);
          const jsonFilename = currentCommit.files[0];
          const ymlFilename = jsonFilename.replace(
            /(\w+).json/g,
            "$1" + ".yml"
          );
          const ymlPath = path.join(cwd, ymlFilename);
          fs.writeFile(ymlPath, strData, "utf-8").then(async () => {
            console.log(`Decrypted ${ymlFilename}`);
            await runChildProcessAsync(
              GIT_BIN,
              ["add", ymlFilename, "--renormalize"],
              {
                spawnArgs,
              }
            );
            console.log(`Added ${ymlFilename} to git`);
            await runChildProcessAsync(GIT_BIN, ["rm", jsonFilename], {
              spawnArgs,
            });
            console.log(`Removed ${jsonFilename} from git`);
            resolve(null);
          });
        });
    } else {
      const discardedCommit = {
        commitInfo: currentCommit,
        reason,
      };
      console.warn("Discarding commit", discardedCommit);
      resolve(null);
    }
  });
}

for await (const line of gitLog) {
  if (line.startsWith("///")) {
    await decryptCurrentCommit();
    console.log("");
    currentCommit = {
      sha: line.substr(3, 40),
      signatureStatus: line.charAt(44),
      author: line.slice(46),
      files: [],
    };
  } else if (line !== "") {
    currentCommit?.files.push(line);
  }
}
await decryptCurrentCommit();

await runChildProcessAsync(
  GIT_BIN,
  ["commit", "-m", "Decrypted all valid ballots"],
  {
    spawnArgs,
  }
);

await runChildProcessAsync(GIT_BIN, ["push"], {
  spawnArgs,
});
