#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { env } from "process";

import parsedArgs from "../utils/parsedArgs.js";
import encryptBallot from "../crypto/rsa-aes-encrypt.js";
import { loadYmlFile, templateBallot, VoteFileFormat } from "../parser.js";

const repoUrl = parsedArgs["repo"] ?? parsedArgs["r"];
const branch = parsedArgs["branch"] ?? parsedArgs["b"];
const subPath = parsedArgs["path"] ?? parsedArgs["p"] ?? ".";

const GIT_BIN = parsedArgs["git-binary"] ?? env.GIT ?? "git";

const runChildProcessAsync = (
  cmd: string,
  args: any[] | readonly string[],
  { captureStdout = false, spawnArgs = {} } = {}
) =>
  new Promise((resolve, reject) => {
    const opt = {
      stdio: captureStdout ? ["inherit", "pipe", "inherit"] : "inherit",
      ...spawnArgs,
    };
    const child = spawn(cmd, args, opt as any);
    let stdout;
    if (captureStdout) {
      stdout = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }
    child.once("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`${cmd} ${args} failed: ${code}`));
      }
      return resolve(stdout?.trim());
    });
  }) as Promise<string>;

const [EDITOR, username, emailAddress] = await Promise.all([
  parsedArgs["editor"] ||
    env.VISUAL ||
    env.EDITOR ||
    runChildProcessAsync(GIT_BIN, ["config", "--get", "core.editor"], {
      captureStdout: true,
    }),
  parsedArgs["username"] ||
    parsedArgs["u"] ||
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
const { encryptedSecret, data } = await encryptBallot(
  await fs.readFile(path.join(cwd, subPath, `${username}.yml`)),
  vote.publicKey
);

await fs.writeFile(
  path.join(cwd, subPath, `${username}.json`),
  JSON.stringify({
    username,
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
