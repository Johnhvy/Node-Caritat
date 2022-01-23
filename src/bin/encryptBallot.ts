#!/usr/bin/env node

import * as fs from "fs";

import parseArgs from "../utils/parseArgs.js";
import encryptBallot from "../crypto/rsa-aes-encrypt.js";

const parsedArgs = parseArgs().options({
  file: {
    alias: "f",
    describe: "Path to the file to encrypt",
    normalize: true,
    type: "string",
  },
  key: {
    alias: "k",
    describe: "Path to the public key file",
    normalize: true,
    type: "string",
  },
}).argv;

const { file: filePath, key: publicKeyPath } = parsedArgs;

const { encryptedSecret, data } = await encryptBallot(
  fs.readFileSync(filePath),
  fs.readFileSync(publicKeyPath)
);

console.log(
  JSON.stringify({
    encryptedSecret: Buffer.from(encryptedSecret).toString("base64"),
    data: Buffer.from(data).toString("base64"),
  })
);
