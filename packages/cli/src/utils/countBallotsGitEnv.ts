import cliArgsForGit from "./cliArgsForGit.js";
import { env } from "node:process";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";

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
  ["key-part"]: {
    alias: "h",
    describe:
      "A part of the secret, or the whole secret (if only one key part is supplied), encoded in base64. You should provide as many key-part as necessary to reconstitute the secret.",
    array: true,
  },
  mailmap: {
    describe: "Path to the mailmap file",
    normalize: true,
    type: "string",
  },
};

export async function getEnv(parsedArgs: Record<string, unknown>) {
  const GIT_BIN = (parsedArgs["git-binary"] ?? env.GIT ?? "git") as string;

  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "caritat-"));
  return {
    GIT_BIN,
    cwd,
    doNotCleanTempFiles: parsedArgs["do-not-clean"],
  };
}
