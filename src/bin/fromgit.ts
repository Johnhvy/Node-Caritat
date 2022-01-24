#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import os from "os";
import { env } from "process";

import parseArgs from "../utils/parseArgs";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import cliArgsForGit from "../utils/cliArgsForGit.js";

import encryptData from "../crypto/rsa-aes-encrypt.js";
import { loadYmlFile, templateBallot, VoteFileFormat } from "../parser.js";

const parsedArgs = parseArgs().options({
  ...cliArgsForGit,
  editor: {
    describe:
      "Path to the preferred text editor (when not provided, looks for $EDITOR in the environment)",
    normalize: true,
    type: "string",
  },
  username: {
    describe: "Name of the voter (when not provided, look into git config)",
    alias: "u",
    type: "string",
  },
  email: {
    describe:
      "Email address of the voter (when not provided, look into the git config)",
    type: "string",
  },
}).argv;

const { repo: repoUrl, branch, path: subPath } = parsedArgs;

const GIT_BIN = (parsedArgs["git-binary"] ?? env.GIT ?? "git") as string;

const [EDITOR, username, emailAddress] = await Promise.all([
  parsedArgs["editor"] ||
    env.VISUAL ||
    env.EDITOR ||
    runChildProcessAsync(GIT_BIN, ["config", "--get", "core.editor"], {
      captureStdout: true,
    }),
  parsedArgs["username"] ||
    runChildProcessAsync(GIT_BIN, ["config", "--get", "user.name"], {
      captureStdout: true,
    }),
  parsedArgs["email"] ||
    runChildProcessAsync(GIT_BIN, ["config", "--get", "user.email"], {
      captureStdout: true,
    }),
]);

const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
const spawnArgs = { cwd };

console.log("Cloning remote repository...");
await runChildProcessAsync(
  GIT_BIN,
  ["clone", "--branch", branch, "--no-tags", "--depth=1", repoUrl, "."],
  { spawnArgs }
);

const vote = loadYmlFile<VoteFileFormat>(path.join(cwd, subPath, "vote.yml"));

const author = `${username} <${emailAddress}>`;
if (!vote.voters.includes(author)) {
  console.warn("It looks like you are not on the list of allowed voters.");
  console.warn({ author, allowedVoters: vote.voters });
}

await fs.writeFile(
  path.join(cwd, subPath, `${username}.yml`),
  templateBallot(vote, { username, emailAddress })
);

console.log("Ballot is ready for edit.");
const editor = EDITOR || (os.platform() === "win32" && "notepad");
await runChildProcessAsync(editor, [
  path.join(cwd, subPath, `${username}.yml`),
]);

console.log("Encrypting ballot with vote public key...");
const { encryptedSecret, data } = await encryptData(
  await fs.readFile(path.join(cwd, subPath, `${username}.yml`)),
  vote.publicKey
);

await fs.writeFile(
  path.join(cwd, subPath, `${username}.json`),
  JSON.stringify({
    author,
    encryptedSecret: Buffer.from(encryptedSecret).toString("base64"),
    data: Buffer.from(data).toString("base64"),
  })
);

console.log("Commit encrypted ballot.");
await runChildProcessAsync(
  GIT_BIN,
  ["add", path.join(cwd, subPath, `${username}.json`)],
  { spawnArgs }
);
await runChildProcessAsync(GIT_BIN, ["commit", "-m", `vote from ${username}`], {
  spawnArgs,
});

console.log("Pushing to the remote repository...");
try {
  await runChildProcessAsync(GIT_BIN, ["push", repoUrl, `HEAD:${branch}`], {
    spawnArgs,
  });
} catch {
  console.log(
    "Pushing failed, maybe because the local branch is outdated. Attempting a rebase..."
  );
  await runChildProcessAsync(GIT_BIN, ["fetch", repoUrl, branch], {
    spawnArgs,
  });
  await runChildProcessAsync(GIT_BIN, ["rebase", "FETCH_HEAD"], { spawnArgs });

  console.log("Pushing to the remote repository...");
  await runChildProcessAsync(GIT_BIN, ["push", repoUrl, `HEAD:${branch}`], {
    spawnArgs,
  });
}

if (!parsedArgs.hasOwnProperty("do-not-clean")) {
  await fs.rm(cwd, { recursive: true, force: true });
}
