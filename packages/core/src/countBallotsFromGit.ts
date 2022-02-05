#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import os from "os";
import { env } from "process";

import runChildProcessAsync from "./utils/runChildProcessAsync.js";
import streamChildProcessStdout from "./utils/streamChildProcessStdout.js";
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
    ["clone", "--branch", branch, "--no-tags", "--single-branch", repoUrl, "."],
    { spawnArgs }
  );

  const vote = new Vote();
  vote.loadFromString(
    await readFileAtRevision(
      GIT_BIN,
      firstCommitSha,
      path.join(subPath, "vote.yml"),
      spawnArgs
    )
  );

  if (!privateKey) {
    const encryptedKeyFile = path.join(cwd, "privateKey.enc");
    await fs.writeFile(encryptedKeyFile, vote.voteFileData.encryptedPrivateKey);
    privateKey = await runChildProcessAsync("gpg", ["-d", encryptedKeyFile], {
      captureStdout: true,
    });
  }

  const gitLog = streamChildProcessStdout(
    GIT_BIN,
    [
      "--no-pager",
      "log",
      `${firstCommitSha}..HEAD`,
      '--format="///%H %G? %an <%ae>"',
      "--name-only",
    ],
    spawnArgs
  );

  const decryptPromises = [];
  let currentCommit;
  for await (const line of gitLog) {
    if (line.startsWith("///")) {
      if (vote.canAcceptCommit(currentCommit)) {
        decryptPromises.push(
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
            .then((data: BufferSource) => vote.addBallotFromBufferSource(data))
        );
      } else {
        console.log("Discarding commit", currentCommit);
      }
      currentCommit = {
        sha: line.substr(3, 40),
        signatureStatus: line.charAt(45),
        author: line.slice(47),
        files: [],
      };
    } else if (line !== "") {
      currentCommit?.files.push(line);
    }
  }

  await Promise.all(decryptPromises);

  const result = vote.count();
  console.log(vote.generateSummary(privateKey.toString()));
}
