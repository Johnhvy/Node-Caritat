import { readFile } from "fs/promises";
import path from "path";

import streamChildProcessStdout from "./utils/streamChildProcessStdout.js";

import Vote, { VoteCommit } from "./vote.js";

interface checkCommitArgs {
  GIT_BIN?: string;
  cwd?: string;
  subPath: string;
  commitRef?: string;
}

export default async function reasonToDiscardCommit({
  GIT_BIN = "git",
  cwd = ".",
  subPath,
  commitRef = "HEAD",
}: checkCommitArgs) {
  const spawnArgs = { cwd };

  const vote = new Vote();
  vote.loadFromFile(path.join(cwd, subPath, "vote.yml"));
  const gitShow = streamChildProcessStdout(
    GIT_BIN,
    [
      "--no-pager",
      "show",
      `${commitRef}`,
      "--format=///%H %G? %aN <%aE>",
      "--name-only",
    ],
    spawnArgs
  );
  let currentCommit: VoteCommit;
  for await (const line of gitShow) {
    if (line.startsWith("///")) {
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
  const reason = vote.reasonToDiscardCommit(currentCommit);
  if (reason == null) {
    let data;
    try {
      data = JSON.parse(await readFile(currentCommit.files[0], "utf-8"));
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
  return reason;
}
