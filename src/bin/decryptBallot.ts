#!/usr/bin/env node

import fs from "fs";

import parseArgs from "../utils/parseArgs.js";
import decryptBallot from "../crypto/rsa-aes-decrypt.js";

const parsedArgs = parseArgs().options({
  data: {
    describe: "Path to JSON file containing the encrypted ballot",
    alias: "d",
    demandOption: true,
    normalize: true,
    type: "string",
  },
  key: {
    alias: "k",
    describe: "Path to the private key file",
    demandOption: true,
    normalize: true,
    type: "string",
  },
}).argv;

const { data: filePath, key: privateKeyPath } = parsedArgs;

const { encryptedSecret, data } = JSON.parse(
  fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
);

console.log(
  Buffer.from(
    new Uint8Array(
      await decryptBallot(
        encryptedSecret,
        data,
        fs.readFileSync(privateKeyPath)
      )
    )
  ).toString("utf8")
);
