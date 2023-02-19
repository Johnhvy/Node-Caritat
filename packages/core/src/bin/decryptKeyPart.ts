import { spawn } from "node:child_process";
import { once } from "node:events";
import { argv, env, stdin } from "node:process";

import * as yaml from "js-yaml";
import type { VoteFileFormat } from "../parser.js";

let yamlString: string;
if (argv[2] === "-h" || argv[2] === "--help") {
  console.log("Usage:");
  console.log("decryptKeyPath < path/to/vote.yml");
  console.log("curl -L http://example.com/vote.yml | decryptKeyPath");
  console.log(
    "decryptKeyPath https://github.com/owner/repo/pull/1 # requires gh CLI tool"
  );
  console.log(
    "decryptKeyPath https://github.com/owner/repo/pull/1 --post-comment # requires gh CLI tool"
  );
  console.log(
    "Upon success, this tool will output to stdout a base64 representation of the decrypted key part."
  );
} else if (argv[2]) {
  throw new Error("not implemented");
} else {
  // @ts-ignore
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
    // @ts-ignore toArray exists
    const stdout = cp.stdout.toArray();
    stdout.catch(Function.prototype); // ignore errors.
    cp.stdin.end(share);
    const [code] = await Promise.race([
      once(cp, "exit"),
      once(cp, "error").then((er) => Promise.reject(er)),
    ]);
    if (code !== 0) throw new Error("failed", { cause: code });
    return Buffer.concat(await stdout).toString("base64");
  })
);
ac.abort();
console.log(out);
