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
import type { VoteCommit } from "./vote.js";
import Vote from "./vote.js";
import { DiscardedCommit } from "./summary/electionSummary.js";

// TODO add GPG argument.
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
  mailmap: {
    describe: "Path to the mailmap file",
    normalize: true,
    type: "string",
  },
};

export async function getEnv(
  parsedArgs: Record<string, unknown>
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
  mailmap,
  startDate = undefined,
}): Promise<void> {
  const spawnArgs = { cwd };

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

  const vote = new Vote();
  vote.loadFromFile(path.join(cwd, subPath, "vote.yml"));

  if (!privateKey) {
    const encryptedKeyFile = path.join(cwd, "privateKey.enc");
    await fs.writeFile(encryptedKeyFile, vote.voteFileData.encryptedPrivateKey);
    privateKey = await runChildProcessAsync("gpg", ["-d", encryptedKeyFile], {
      captureStdout: true,
    });
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
  const discardedCommits: DiscardedCommit[] = [];
  function countCurrentCommit() {
    if (currentCommit == null) return;

    const reason = vote.reasonToDiscardCommit(currentCommit);
    if (reason == null) {
      const { author } = currentCommit;
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
          .then((data: BufferSource) =>
            vote.addBallotFromBufferSource(data, author)
          )
      );
    } else {
      const discardedCommit = {
        commitInfo: currentCommit,
        reason,
      };
      console.warn("Discarding commit", discardedCommit);
      discardedCommits.push(discardedCommit);
    }
  }

  const decryptPromises = [];
  for await (const line of gitLog) {
    if (line.startsWith("///")) {
      countCurrentCommit();
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
  countCurrentCommit();

  await Promise.all(decryptPromises);

  const result = vote.count();
  console.log(
    vote.generateSummary(privateKey.toString(), { startDate, discardedCommits })
  );
}
