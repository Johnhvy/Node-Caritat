import { spawn } from "node:child_process";
import { once } from "node:events";
import { argv, env, exit, stdin, stdout } from "node:process";

import * as yaml from "js-yaml";
import type { VoteFileFormat } from "../parser.js";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";

if (argv.length > 3 && argv[3] !== "--post-comment") {
  console.warn("Unknown flag:", argv[3]);
  argv[2] = "-h"; // print help message
}

let yamlString: string;
if (argv[2] === "-h" || argv[2] === "--help") {
  console.log("Usage:");
  console.log("decryptKeyPath --armor < path/to/vote.yml");
  console.log("curl -L http://example.com/vote.yml | decryptKeyPath | base64");
  console.log(
    "decryptKeyPath https://github.com/owner/repo/pull/1 # requires gh CLI tool"
  );
  console.log(
    "decryptKeyPath https://github.com/owner/repo/pull/1 --post-comment # requires gh CLI tool"
  );
  console.log(
    "Upon success, this tool will output to stdout a base64 representation of the decrypted key part."
  );
  exit(0);
} else if (argv[2] && argv[2] !== "--armor") {
  const gh_PR_URL =
    /^https?:\/\/github.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(argv[2]);
  if (gh_PR_URL == null) throw new Error("Invalid PR URL format");
  const [, owner, repo, prId] = gh_PR_URL;
  const filesData = JSON.parse(
    await runChildProcessAsync(
      env.GH_BIN || "gh",
      [
        "api",
        "-H",
        "Accept: application/vnd.github+json",
        `/repos/${owner}/${repo}/pulls/${prId}/files`,
      ],
      { captureStdout: true }
    )
  );
  const { contents_url } = filesData.find(({ filename }) =>
    /(^|\/)vote.yml$/.test(filename)
  );
  yamlString = await runChildProcessAsync(
    env.GH_BIN || "gh",
    ["api", "-H", "Accept: application/vnd.github.raw", contents_url],
    { captureStdout: true }
  );
} else {
  // @ts-expect-error toArray exists
  yamlString = (await stdin.toArray()).join();
}

const { shares } = yaml.load(yamlString) as VoteFileFormat;
const ac = new AbortController();
const out = await Promise.any(
  shares.map(async (share) => {
    const cp = spawn(env.GPG_BIN || "gpg", ["-d"], {
      stdio: ["pipe", "pipe", "inherit"],
      signal: ac.signal,
    });
    // @ts-expect-error toArray exists
    const stdout = cp.stdout.toArray();
    stdout.catch(Function.prototype); // ignore errors.
    cp.stdin.end(share);
    const [code] = await Promise.race([
      once(cp, "exit"),
      once(cp, "error").then((er) => Promise.reject(er)),
    ]);
    if (code !== 0) throw new Error("failed", { cause: code });
    return Buffer.concat(await stdout);
  })
);
ac.abort();

if (argv[3] === "--post-comment") {
  await runChildProcessAsync(env.GH_BIN || "gh", [
    "pr",
    "comment",
    argv[2],
    "-b",
    `I would like to close this vote, and for this effect, I'm revealing my ` +
      `key part:\n\n${"```"}\n-----BEGIN SHAMIR KEY PART-----\n${out.toString(
        "base64"
      )}\n-----END SHAMIR KEY PART-----\n${"```"}\n`,
  ]);
} else if (argv[2] === "--armor") {
  console.log("-----BEGIN SHAMIR KEY PART-----");
  console.log(out.toString("base64"));
  console.log("-----END SHAMIR KEY PART-----");
} else {
  stdout.write(out);
}
