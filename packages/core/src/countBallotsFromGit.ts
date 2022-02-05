#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import os from "os";
import { env } from "process";

import parseArgs from "./utils/parseArgs.js";
import runChildProcessAsync from "./utils/runChildProcessAsync.js";
import cliArgsForGit from "./utils/cliArgsForGit.js";

// @ts-ignore
import decryptData from "@aduh95/caritat-crypto/decrypt";
import Vote from "./vote.js";

export const cliArgs = {
  ...cliArgsForGit,
  key: {
    alias: "k",
    describe:
      "Path to the private key file (use - to read from stdin). If not provided, the private key will be extracted from the vote.yml file.",
    demandOption: false,
    normalize: true,
    type: "string",
  },
};

export async function getEnv(
  parsedArgs
): Promise<{ GIT_BIN: string; cwd: string }> {
  const GIT_BIN = (parsedArgs["git-binary"] ?? env.GIT ?? "git") as string;

  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
  return {
    GIT_BIN,
    cwd,
  };
}

export default async function countFromGit({
  GIT_BIN,
  cwd,
  repoUrl,
  branch,
  subPath,
  privateKey,
  firstCommitSha,
}): Promise<void> {
  const spawnArgs = { cwd };

  console.error("Cloning remote repository...");
  await runChildProcessAsync(
    GIT_BIN,
    ["clone", "--branch", branch, "--no-tags", "--depth=1", repoUrl, "."],
    { spawnArgs }
  );

  await runChildProcessAsync(
    GIT_BIN,
    ["checkout", firstCommitSha, "--", path.join(subPath, "vote.yml")],
    { spawnArgs }
  );

  const vote = new Vote();
  vote.loadFromFile(path.join(cwd, subPath, "vote.yml"));
  if (!privateKey) {
    const encryptedKeyFile = path.join(cwd, "privateKey.enc");
    await fs.writeFile(encryptedKeyFile, vote.voteFileData.encryptedPrivateKey);
    privateKey = await runChildProcessAsync("gpg", ["-d", encryptedKeyFile], {
      captureStdout: true,
    });
  }

  // TODO: check commits signatures?

  // git log ${firstCommitHash}..HEAD --format="///%H %an <%ae>" --name-only

  const decryptPromises = [];
  for await (const dirent of await fs.opendir(path.join(cwd, subPath))) {
    if (dirent.isDirectory() || !dirent.name.endsWith(".json")) continue;

    console.error("reading", dirent.name, "...");

    // TODO: check git history for tempering

    const { encryptedSecret, data } = JSON.parse(
      (await fs.readFile(path.join(cwd, subPath, dirent.name), "utf8")).replace(
        /^\uFEFF/,
        ""
      )
    );

    decryptPromises.push(
      decryptData(
        Buffer.from(encryptedSecret, "base64"),
        Buffer.from(data, "base64"),
        privateKey
      ).then((data: BufferSource) => vote.addBallotFromBufferSource(data))
    );
  }

  await Promise.all(decryptPromises);

  const result = vote.count();
  console.log(vote.generateSummary(privateKey.toString()));
}
