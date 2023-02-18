import * as yaml from "js-yaml";
import { rm, writeFile } from "node:fs/promises";
import { stdin } from "node:process";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
// @ts-ignore
const { shares } = yaml.load((await stdin.toArray()).join());
let out;
for (const share of shares) {
  await writeFile("todo", share);
  try {
    out = await runChildProcessAsync("gpg", ["-d", "todo"], {
      captureStdout: true,
    });
  } catch {}
  if (out) break;
}
await rm("todo", { force: true });
console.log(out);
