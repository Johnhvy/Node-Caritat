#!/usr/bin/env node

import * as fs from "fs";

import parseArgs from "../utils/parseArgs.js";
// @ts-ignore
import encryptData from "@aduh95/caritat-crypto/encrypt";

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

const { encryptedSecret, data } = await encryptData(
  fs.readFileSync(filePath),
  fs.readFileSync(publicKeyPath)
);

console.log(
  JSON.stringify({
    encryptedSecret: Buffer.from(encryptedSecret).toString("base64"),
    data: Buffer.from(data).toString("base64"),
  })
);
