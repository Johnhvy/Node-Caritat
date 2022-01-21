#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as http from "isomorphic-git/http/node/index.cjs";
import * as os from "os";
import * as crypto from "crypto";
import * as yaml from "js-yaml";

import type { PathOrFileDescriptor } from "fs";
import {
  BallotFileFormat,
  checkBallot,
  loadYmlFile,
  templateBallot,
  VoteFileFormat,
} from "./parser.js";

import * as minimist from "minimist";
import git from "isomorphic-git";
import Vote, { Ballot, VoteResult } from "./vote.js";

function decryptSecret(encryptedSecret: Buffer, privateKey: crypto.KeyObject) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
      oaepHash: "sha256",
    },
    encryptedSecret
  );
}

function decryptMessage(payload: Buffer, secret: Uint8Array): Buffer {
  const salt = payload.slice(8, 16);
  const key_iv = crypto.pbkdf2Sync(secret, salt, 10000, 32 + 16, "sha256");
  const key = key_iv.slice(0, 32);
  const iv = key_iv.slice(32);

  const encryptedData = payload.slice(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decryptedData = decipher.update(encryptedData);
  return Buffer.concat([decryptedData, decipher.final()]);
}

function count(dirPath: string, privateKeyPath: string) {
  let vote: Vote = new Vote();
  vote.loadFromFile(path.join(dirPath, "vote.yml"));

  let privateKey = crypto.createPrivateKey(fs.readFileSync(privateKeyPath));

  let ballotDir = path.join(dirPath, "ballots");
  let ballotFilesPaths: string[] = fs.readdirSync(ballotDir);
  ballotFilesPaths.forEach((fileName) => {
    let filePath = path.join(ballotDir, fileName);
    let encryptedFile = JSON.parse(fs.readFileSync(filePath).toString());

    console.log(Buffer.from(encryptedFile.key, "base64").toString("hex"));

    let decryptedSecret = decryptSecret(
      Buffer.from(encryptedFile.key, "base64"),
      privateKey
    );

    console.log("decrypted key: ", decryptedSecret.toString("hex"));

    let decryptedBallot = decryptMessage(
      Buffer.from(encryptedFile.data, "base64"),
      decryptedSecret
    );

    console.log(decryptedBallot.toString("utf-8"));

    let ballotData: BallotFileFormat = yaml.load(
      decryptedBallot.toString("utf-8")
    ) as BallotFileFormat;
    let ballot: Ballot = vote.addBallotFile(ballotData);
  });
  let result: VoteResult = vote.getResult();
  console.log("the winner is " + result.winner);
}

function fromGit(
  url: string,
  branch: string,
  tmpDir: string,
  printKey: boolean,
  verbose: boolean
) {
  let vote: Vote = new Vote();
  if (verbose) {
    console.log(
      "fetching" +
        (branch !== null ? " branch " + branch + " " : "") +
        " from repo: " +
        url +
        "..."
    );
  }
  git
    .clone({
      fs,
      http,
      dir: tmpDir,
      url: url,
      singleBranch: branch !== null,
      ref: branch,
    })
    .then(() => {
      vote.loadFromFile(path.join(tmpDir, "vote.yml"));
      let ballot = templateBallot(vote.voteFileData);
      let publicKey = vote.voteFileData.publicKey;
      if (verbose) {
        console.log("Ballot template (yaml): ");
      }
      console.log(ballot);
      if (printKey) {
        if (verbose) {
          console.log("Public key for encrypting ballot :");
        }
        console.log(publicKey);
      }
    });
}

function main(argv: string[]): void {
  let parsedArgs = (minimist as any as { default: typeof minimist }).default(
    argv
  );
  // console.log(parsedArgs);
  const tmpDir = path.join(os.tmpdir(), "caritat");
  let verbose: boolean = parsedArgs["v"] ?? false;
  let vote: Vote = new Vote();

  if ("count" in parsedArgs) {
    // starts the count
    let dirPath: string = parsedArgs["count"] ?? process.cwd();
    let keyPath: string = parsedArgs["key"];
    count(dirPath, keyPath);
  } else if ("from-git" in parsedArgs) {
    let url: string = parsedArgs["from-git"];
    let branch: string = parsedArgs["branch"] ?? parsedArgs["b"] ?? null;
    fromGit(url, branch, tmpDir, parsedArgs["k"], verbose);
  } else if ("extract-key-from-file" in parsedArgs) {
    let filePathRaw = parsedArgs["extract-key-from-file"];
    let filePath: string = null;
    if (filePathRaw === true) {
      // if no arguments are given, we check for the last file in the tmp dir
      filePath = path.join(tmpDir, "vote.yml");
      if (fs.existsSync(filePath)) {
        vote.loadFromFile(filePath);
      }
    } else {
      filePath = path.normalize(filePathRaw);
      if (fs.existsSync(filePath)) {
        vote.loadFromFile(filePath);
      }
    }
    console.log(vote.voteFileData.publicKey);
  }
}
main(process.argv);
