import fs from "fs/promises";
import { readSync } from "fs";
import path from "path";
import os from "os";
import { env } from "process";

import runChildProcessAsync from "./utils/runChildProcessAsync.js";
import cliArgsForGit from "./utils/cliArgsForGit.js";

// @ts-ignore
import encryptData from "@aduh95/caritat-crypto/encrypt";
import {
  BallotFileFormat,
  loadYmlFile,
  parseYml,
  templateBallot,
  VoteFileFormat,
} from "./parser.js";
import { summarizeCondorcetBallot } from "./summary/condorcetSummary.js";

function getChar() {
  let buffer = Buffer.alloc(1);
  let char = "";
  while (char !== "Y" && char !== "y" && char !== "N" && char !== "n") {
    readSync(0, buffer, 0, 1, 0);
    char = buffer.toString("utf8");
  }
  return char;
}

export const cliArgs = {
  ...cliArgsForGit,
  editor: {
    describe:
      "Path to the preferred text editor (when not provided, looks for $EDITOR in the environment)",
    normalize: true,
    type: "string",
  },
  handle: {
    describe: "GitHub handle (optional)",
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
  abstain: {
    describe: "Use this flag to create a blank ballot and skip the voting",
    type: "boolean",
  },
  ["gpg-sign"]: {
    alias: "S",
    describe: "GPG-sign commits.",
  },
};

export async function getEnv(parsedArgs) {
  const GIT_BIN = (parsedArgs["git-binary"] ?? env.GIT ?? "git") as string;

  const [EDITOR, username, emailAddress] = await Promise.all([
    parsedArgs["editor"] ||
      env.VISUAL ||
      env.EDITOR ||
      runChildProcessAsync(GIT_BIN, ["config", "--get", "core.editor"], {
        captureStdout: true,
      }).catch(() => ""),
    parsedArgs["username"] ||
      runChildProcessAsync(GIT_BIN, ["config", "--get", "user.name"], {
        captureStdout: true,
      }),
    parsedArgs["email"] ||
      runChildProcessAsync(GIT_BIN, ["config", "--get", "user.email"], {
        captureStdout: true,
      }),
  ]);

  return {
    GIT_BIN,
    EDITOR,
    username,
    emailAddress,
    abstain: parsedArgs.abstain,
    signCommits: parsedArgs["gpg-sign"] === true,
    doNotCleanTempFiles: parsedArgs.hasOwnProperty("do-not-clean"),
  };
}

export default async function voteUsingGit({
  GIT_BIN,
  EDITOR,
  repoUrl,
  branch,
  subPath,
  handle,
  username,
  emailAddress,
  abstain,
  signCommits,
  doNotCleanTempFiles,
}) {
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
  if (!vote.allowedVoters?.includes(author)) {
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
      const editor = EDITOR || (os.platform() === "win32" && "notepad");
      await runChildProcessAsync(editor, [
        path.join(cwd, subPath, `${handle || username}.yml`),
      ]);
      rawBallot = await fs.readFile(
        path.join(cwd, subPath, `${handle || username}.yml`)
      );
      {
        const ballotData = parseYml<BallotFileFormat>(
          textDecoder.decode(rawBallot)
        );

        let preferences = new Map(
          ballotData.preferences.map((element) => [
            element.title,
            element.score,
          ])
        );
        let ballot = {
          voter: { id: ballotData.author },
          preferences,
        };
        switch (vote.method) {
          case "Condorcet":
            console.log(
              "Your order of preferences:\n",
              summarizeCondorcetBallot(ballot)
            );
            break;
          default:
            break;
        }
        console.log("Do you want to continue (Y/N)?");
        const char = getChar();
        editFile = char === "N" || char === "n";
      }
    }
  }

  console.log("Encrypting ballot with vote public key...");
  const { encryptedSecret, data } = await encryptData(
    rawBallot,
    vote.publicKey
  );

  await fs.writeFile(
    path.join(cwd, subPath, `${handle || username}.json`),
    JSON.stringify({
      author,
      encryptedSecret: Buffer.from(encryptedSecret).toString("base64"),
      data: Buffer.from(data).toString("base64"),
    }) + "\n"
  );

  console.log("Commit encrypted ballot.");
  await runChildProcessAsync(
    GIT_BIN,
    ["add", path.join(cwd, subPath, `${handle || username}.json`)],
    { spawnArgs }
  );
  await runChildProcessAsync(
    GIT_BIN,
    [
      "commit",
      ...(signCommits ? ["-S"] : []),
      "-m",
      `vote from ${handle || username}`,
    ],
    {
      spawnArgs,
    }
  );

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
    await runChildProcessAsync(GIT_BIN, ["reset", "--hard"], {
      spawnArgs,
    });
    await runChildProcessAsync(GIT_BIN, ["rebase", "FETCH_HEAD"], {
      spawnArgs,
    });
    if (signCommits) {
      await runChildProcessAsync(
        GIT_BIN,
        ["commit", "--amend", "--no-edit", "-S"],
        { spawnArgs }
      );
    }

    console.log("Pushing to the remote repository...");
    await runChildProcessAsync(GIT_BIN, ["push", repoUrl, `HEAD:${branch}`], {
      spawnArgs,
    });
  }

  if (!doNotCleanTempFiles) {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}
