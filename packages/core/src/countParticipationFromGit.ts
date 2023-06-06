import path from "path";

import streamChildProcessStdout from "./utils/streamChildProcessStdout.js";

import Vote, { VoteCommit } from "./vote.js";
import runChildProcessAsync from "./utils/runChildProcessAsync.js";

interface checkCommitArgs {
  GIT_BIN?: string;
  cwd?: string;
  subPath: string;
  firstCommitRef: string;
  lastCommitRef?: string;
  reportInvalidCommitsAfter?: string;
}

async function getReasonToDiscardVoteFile(
  commit: VoteCommit,
  GIT_BIN: string,
  cwd: string
) {
  let data;
  try {
    data = JSON.parse(
      await runChildProcessAsync(
        GIT_BIN,
        ["show", `${commit.sha}:${commit.files[0]}`],
        { captureStdout: true, spawnArgs: { cwd } }
      )
    );
  } catch (e) {
    return "invalid vote file: " + e.message;
  }
  if (!data?.encryptedSecret || typeof data.encryptedSecret !== "string") {
    return "Missing or invalid encryptedSecret key";
  }
  if (!data?.data || typeof data.data !== "string") {
    return "Missing or invalid data key";
  }
}

export default async function countParticipation({
  GIT_BIN = "git",
  cwd = ".",
  subPath,
  firstCommitRef,
  lastCommitRef = "HEAD",
  reportInvalidCommitsAfter,
}: checkCommitArgs) {
  const spawnArgs = { cwd };

  const vote = new Vote();
  vote.loadFromFile(path.join(cwd, subPath, "vote.yml"));

  let currentCommit: VoteCommit, invalidCommits: Record<string, string>;
  let shouldReport = false;
  if (reportInvalidCommitsAfter) {
    // We can only compare SHAs, so we need to parse the refs to compare them.
    invalidCommits = { __proto__: null };
    const gitRevParse = streamChildProcessStdout(GIT_BIN, [
      "rev-parse",
      firstCommitRef,
      reportInvalidCommitsAfter,
    ]);
    const firstCommitSHA = (await gitRevParse.next()).value as string;
    reportInvalidCommitsAfter = (await gitRevParse.next()).value as string;
    shouldReport = firstCommitSHA === reportInvalidCommitsAfter;
  }
  const gitShow = streamChildProcessStdout(
    GIT_BIN,
    [
      "--no-pager",
      "log",
      `${firstCommitRef}..${lastCommitRef}`,
      "--format=///%H %G? %aN <%aE>",
      "--name-only",
    ],
    spawnArgs
  );
  const validVoters = [];
  for await (const line of gitShow) {
    if (line.startsWith("///")) {
      if (currentCommit) {
        const reason =
          vote.reasonToDiscardCommit(currentCommit) ||
          (await getReasonToDiscardVoteFile(currentCommit, GIT_BIN, cwd));
        if (reason == null) {
          validVoters.push(currentCommit.author);
          vote.addFakeBallot(currentCommit.author);
        } else if (shouldReport) {
          invalidCommits[currentCommit.sha] = reason;
        }
        if (currentCommit.sha === reportInvalidCommitsAfter) {
          shouldReport = true;
        }
      }
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
  if (currentCommit) {
    const reason =
      vote.reasonToDiscardCommit(currentCommit) ||
      (await getReasonToDiscardVoteFile(currentCommit, GIT_BIN, cwd));
    if (reason == null) {
      validVoters.push(currentCommit.author);
      vote.addFakeBallot(currentCommit.author);
    } else if (shouldReport) {
      invalidCommits[currentCommit.sha] = reason;
    }
  }
  return {
    validVoters,
    invalidCommits,
    participation: vote.count().participation,
  };
}
