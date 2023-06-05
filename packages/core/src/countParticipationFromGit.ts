import path from "path";

import streamChildProcessStdout from "./utils/streamChildProcessStdout.js";

import Vote, { VoteCommit } from "./vote.js";

interface checkCommitArgs {
  GIT_BIN?: string;
  cwd?: string;
  subPath: string;
  firstCommitRef: string;
  lastCommitRef?: string;
}

export default async function countParticipation({
  GIT_BIN = "git",
  cwd = ".",
  subPath,
  firstCommitRef,
  lastCommitRef = "HEAD",
}: checkCommitArgs) {
  const spawnArgs = { cwd };

  const vote = new Vote();
  vote.loadFromFile(path.join(cwd, subPath, "vote.yml"));
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
  let currentCommit: VoteCommit;
  let validVoters = [];
  for await (const line of gitShow) {
    if (line.startsWith("///")) {
      if (currentCommit && vote.reasonToDiscardCommit(currentCommit) == null) {
        validVoters.push(currentCommit.author);
        vote.addFakeBallot(currentCommit.author);
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
  if (currentCommit && vote.reasonToDiscardCommit(currentCommit) == null) {
    validVoters.push(currentCommit.author);
    vote.addFakeBallot(currentCommit.author);
  }
  return { validVoters, participation: vote.count().participation };
}
