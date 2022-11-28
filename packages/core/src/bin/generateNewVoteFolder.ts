#!/usr/bin/env node

import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createInterface as readLines } from "node:readline";
import parseArgs from "../utils/parseArgs.js";

import * as yaml from "js-yaml";

// @ts-ignore
import { generateAndSplitKeyPair } from "@aduh95/caritat-crypto/generateSplitKeyPair";

const parsedArgs = parseArgs().options({
  directory: {
    describe: "The directory where the vote files should be created",
    demandOption: true,
    alias: "d",
  },
  "vote-file": {
    describe:
      "Path to a YAML file that contains the vote instruction. If not provided, a blank template will be used",
    normalize: true,
    string: true,
  },
  "gpg-binary": {
    describe: "Path to the gpg binary (when not provided, looks in the $PATH)",
    normalize: true,
    string: true,
  },
  method: {
    describe: "Vote method to use. Defaults to Condorcet.",
    string: true,
  },
  "list-of-shareholders": {
    describe:
      "Path to the list of person that needs to receive a part of the secret. The list should be in markdown format.",
    normalize: true,
    string: true,
  },
  threshold: {
    describe:
      "Minimal number of shareholders required to reconstruct the vote private key. Defaults to 1.",
    string: true,
  },
  subject: {
    describe: "Subject for the vote.",
    string: true,
  },
  "header-instructions": {
    describe: "Instructions to show in the header of the ballot.",
    string: true,
  },
  "footer-instructions": {
    describe: "Instructions to show in the footer of the ballot.",
    string: true,
  },
  candidates: {
    describe:
      "Path to the list of candidates (vote options). The list should be in markdown format.",
    normalize: true,
    string: true,
  },
  "allowed-voters": {
    describe:
      "Path to the list of candidates (vote options). The list should be in markdown format.",
    normalize: true,
    string: true,
  },
});

const GPG_BIN = parsedArgs["gpg-binary"] ?? "gpg";

const shareHolders = [];
let input, crlfDelay;

if (parsedArgs["list-of-shareholders"] == null) {
  input = process.stdin;
} else {
  const fd = await fs.open(parsedArgs["list-of-shareholders"], "r");
  input = fd.createReadStream();
  crlfDelay = Infinity;
}
const mdListItem = /^\s?[-*]\s?([^<]+) <([^>]+)>\s*$/;
for await (const line of readLines({ input, crlfDelay })) {
  if (line === "") continue;

  const match = mdListItem.exec(line);
  if (match === null) {
    throw new Error("Malformed markdown input");
  }
  shareHolders.push({ name: match[1], email: match[2] });
}

const { encryptedPrivateKey, publicKey, shares } =
  await generateAndSplitKeyPair(shareHolders.length, parsedArgs.threshold);

function toArmordedMessage(data: ArrayBuffer) {
  const str = Buffer.from(data).toString("base64");
  const lines = [];
  for (let i = 0; i < str.length; i += 64) {
    lines.push(str.slice(i, i + 64));
  }
  return lines.join("\n");
}

const ballot = {
  subject: parsedArgs.subject,
  headerInstructions: parsedArgs["header-instructions"],
  candidates: parsedArgs.candidates,
  footerInstructions: parsedArgs["footer-instructions"],
  method: parsedArgs.method,
  allowedVoters: parsedArgs.allowedVoters,
  publicKey: `-----BEGIN PUBLIC KEY-----\n${toArmordedMessage(
    publicKey
  )}\n-----END PUBLIC KEY-----\n`,
  encryptedPrivateKey: Buffer.from(encryptedPrivateKey).toString("base64"),
  shares: await Promise.all(
    shares.map(
      (raw, i) =>
        new Promise((resolve, reject) => {
          const gpg = spawn(GPG_BIN, [
            "--encrypt",
            "--armor",
            "-r",
            shareHolders[i].email,
          ]);
          gpg.on("error", reject);
          gpg.stdin.end(raw);
          gpg.stderr.pipe(process.stderr);
          gpg.stdout
            .toArray()
            .then((chunks) => resolve(chunks.join("")), reject);
        })
    )
  ),
};

console.log(yaml.dump(ballot));
