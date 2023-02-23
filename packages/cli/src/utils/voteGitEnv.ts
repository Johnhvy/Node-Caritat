import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import { env } from "node:process";
import os from "node:os";
import cliArgsForGit from "../utils/cliArgsForGit.js";

export const cliArgs = {
  ...cliArgsForGit,
  editor: {
    describe:
      "Path to the preferred text editor (when not provided, looks for $VISUAL, $EDITOR, git core.editor and finally fallbacks to vi (or notepad on Windows))",
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
      }).catch(() => (os.platform() === "win32" ? "notepad" : "vi")),
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
    doNotCleanTempFiles: parsedArgs["do-not-clean"],
  };
}
