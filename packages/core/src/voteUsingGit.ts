import fs from "fs/promises";
import path from "path";
import os from "os";
import { stdin, stdout } from "process";
import { once } from "events";
import { webcrypto as crypto } from "crypto";

import runChildProcessAsync from "./utils/runChildProcessAsync.js";
import { getGPGSignGitFlag } from "./utils/gpgSign.js";

import encryptData from "@node-core/caritat-crypto/encrypt";
import {
  BallotFileFormat,
  loadYmlFile,
  parseYml,
  templateBallot,
  VoteFileFormat,
} from "./parser.js";
import {
  getSummarizedBallot,
  summarizeCondorcetBallotForVoter,
} from "./summary/condorcetSummary.js";

export async function voteAndCommit({
  GIT_BIN = "git",
  EDITOR,
  cwd,
  subPath,
  handle,
  username,
  emailAddress,
  abstain,
  gpgSign,
}) {
  const spawnArgs = { cwd };
  const vote = loadYmlFile<VoteFileFormat>(path.join(cwd, subPath, "vote.yml"));

  const author = `${username} <${emailAddress}>`;
  if (vote.allowedVoters && !vote.allowedVoters.includes(author)) {
    console.warn("It looks like you are not on the list of allowed voters.");
    console.warn({ author, allowedVoters: vote.allowedVoters });
  }

  const plainTextBallot = templateBallot(vote, { username, emailAddress });
  let rawBallot: BufferSource;

  if (abstain) {
    console.log("skipping vote...");
    rawBallot = Buffer.from(plainTextBallot);
  } else {
    const textDecoder = new TextDecoder();
    await fs.writeFile(
      path.join(cwd, subPath, `${handle || username}.yml`),
      plainTextBallot
    );

    let editFile = true;
    while (editFile) {
      editFile = false;
      console.log("Ballot is ready for edit.");
      await runChildProcessAsync(EDITOR, [
        path.join(cwd, subPath, `${handle || username}.yml`),
      ]);
      rawBallot = await fs.readFile(
        path.join(cwd, subPath, `${handle || username}.yml`)
      );
      {
        const ballotData = parseYml<BallotFileFormat>(
          textDecoder.decode(rawBallot)
        );

        const preferences = new Map(
          ballotData.preferences.map((element) => [
            element.title,
            element.score,
          ])
        );
        const ballot = getSummarizedBallot({
          voter: { id: ballotData.author },
          preferences,
        });
        switch (vote.method) {
          case "Condorcet":
            console.log("\nHere's how you ballot will be interpreted:\n");
            console.log(summarizeCondorcetBallotForVoter(ballot));
            break;
          default:
            break;
        }
        stdout.write("\nDo you want to cast this vote? [Y/n/a] ");
        stdin.resume();
        const chars = await once(stdin, "data");
        stdin.pause();
        if (
          chars[0][0] === 0x62 || // a
          chars[0][0] === 0x41 // A
        )
          throw new Error("Aborted by the user");
        editFile =
          chars[0][0] === 0x6e || // n
          chars[0][0] === 0x4e; // N
      }
    }
  }
  console.log("Encrypting ballot with vote public key...");
  const { encryptedSecret, saltedCiphertext } = await encryptData(
    rawBallot,
    vote.publicKey
  );

  const jsonFilePath = path.join(
    cwd,
    subPath,
    `${handle || username.replace(/\W/g, "") || crypto.randomUUID()}.json`
  );
  await fs.writeFile(
    jsonFilePath,
    JSON.stringify({
      author,
      encryptedSecret: Buffer.from(encryptedSecret).toString("base64"),
      data: Buffer.from(saltedCiphertext).toString("base64"),
    }) + "\n"
  );

  console.log("Commit encrypted ballot.");
  await runChildProcessAsync(GIT_BIN, ["add", jsonFilePath], { spawnArgs });
  await runChildProcessAsync(
    GIT_BIN,
    [
      "commit",
      ...getGPGSignGitFlag(gpgSign),
      `--author`,
      author,
      "-m",
      `vote from ${handle || username}`,
    ],
    {
      spawnArgs,
    }
  );
}

export default async function voteUsingGit({
  GIT_BIN = "git",
  EDITOR,
  repoURL,
  branch,
  subPath,
  handle,
  username,
  emailAddress,
  abstain,
  gpgSign,
  doNotCleanTempFiles,
}) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
  const spawnArgs = { cwd };

  try {
    console.log("Cloning remote repository...");
    await runChildProcessAsync(
      GIT_BIN,
      ["clone", "--branch", branch, "--no-tags", "--depth=1", repoURL, "."],
      { spawnArgs }
    );

    await voteAndCommit({
      GIT_BIN,
      EDITOR,
      cwd,
      subPath,
      handle,
      username,
      emailAddress,
      abstain,
      gpgSign,
    });

    console.log("Pushing to the remote repository...");
    try {
      await runChildProcessAsync(GIT_BIN, ["push", repoURL, `HEAD:${branch}`], {
        spawnArgs,
      });
    } catch {
      console.log(
        "Pushing failed, maybe because the local branch is outdated. Attempting a rebase..."
      );
      await runChildProcessAsync(GIT_BIN, ["fetch", repoURL, branch], {
        spawnArgs,
      });
      await runChildProcessAsync(GIT_BIN, ["reset", "--hard"], {
        spawnArgs,
      });
      await runChildProcessAsync(
        GIT_BIN,
        ["rebase", "FETCH_HEAD", ...getGPGSignGitFlag(gpgSign), "--quiet"],
        {
          spawnArgs,
        }
      );

      console.log("Pushing to the remote repository...");
      await runChildProcessAsync(GIT_BIN, ["push", repoURL, `HEAD:${branch}`], {
        spawnArgs,
      });
    }
  } finally {
    if (doNotCleanTempFiles) {
      console.info("The temp folder was not removed from the file system", cwd);
    } else {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  }
}
