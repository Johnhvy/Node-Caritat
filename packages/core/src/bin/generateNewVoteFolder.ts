#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import parseArgs from "../utils/parseArgs.js";
import { loadYmlString, templateBallot, VoteFileFormat } from "../parser.js";

import * as yaml from "js-yaml";

// @ts-ignore
import { generateAndSplitKeyPair } from "@aduh95/caritat-crypto/generateSplitKeyPair";

const parsedArgs = parseArgs().options({
  directory: {
    describe: "The directory where the vote files should be created",
    demandOption: true,
    alias: "d",
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
    describe: "List in markdown format of all the shareholders.",
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
  candidate: {
    describe:
      "A candidate that voter can vote for. You can specify any number of candidates",
    string: true,
    array: true,
  },
  "allowed-voter": {
    describe: "Name and email of authorized voter, same format as git",
    string: true,
    array: true,
  },
}).argv;

if (!parsedArgs.directory) {
  throw new Error("You must pass a path for the directory");
}

const directory = path.resolve(parsedArgs.directory);
try {
  const stats = await fs.stat(directory);
  if (!stats.isDirectory())
    throw new Error(`${directory} exists and is not a directory`);
} catch (err) {
  if (err?.code === "ENOENT") {
    await fs.mkdir(directory, { recursive: true });
  } else throw err;
}
const yamlFile = await fs.open(path.join(directory, "vote.yml"), "wx");

const GPG_BIN = parsedArgs["gpg-binary"] ?? process.env.GPG_BIN ?? "gpg";

const shareHolders = [];
const mdListItem = /^\s?[-*]\s?([^<]+) <([^>]+)>\s*$/;
for await (const line of parsedArgs["list-of-shareholders"].split("\n")) {
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
  candidates: parsedArgs.candidate,
  footerInstructions: parsedArgs["footer-instructions"],
  method: parsedArgs.method ?? "Condorcet",
  allowedVoters: parsedArgs["allowed-voter"],
  publicKey: `-----BEGIN PUBLIC KEY-----\n${toArmordedMessage(
    publicKey
  )}\n-----END PUBLIC KEY-----\n`,
  encryptedPrivateKey: Buffer.from(encryptedPrivateKey).toString("base64"),
  shares: (
    await Promise.all<string>(
      shares.map(
        (raw, i) =>
          new Promise((resolve, reject) => {
            const gpg = spawn(GPG_BIN, [
              "--encrypt",
              "--armor",
              "--auto-key-locate",
              "hkps://keys.openpgp.org",
              "--trust-model",
              "always",
              "-r",
              shareHolders[i].email,
            ]);
            gpg.on("error", reject);
            gpg.stdin.end(raw);
            gpg.stderr.pipe(process.stderr);
            gpg.stdout
              // @ts-ignore
              .toArray()
              .then(
                (chunks) => resolve(chunks.join("").replaceAll("\r\n", "\n")),
                reject
              );
          })
      )
    )
  ).filter(String),
};
const yamlString = yaml.dump(ballot);

const vote = loadYmlString<VoteFileFormat>(yamlString);

await fs.writeFile(path.join(directory, "public.pem"), ballot.publicKey);
await fs.writeFile(path.join(directory, "ballot.yml"), templateBallot(vote));
await yamlFile.writeFile(yamlString);
await yamlFile.close();
