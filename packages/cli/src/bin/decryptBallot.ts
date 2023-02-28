#!/usr/bin/env node

import fs from "fs";
 
import parseArgs from "../utils/parseArgs.js";
import decryptData from "@aduh95/caritat-crypto/decrypt";

interface argsType {
  data: string;
  key: string;
}

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
}).argv as any as argsType;

const { data: filePath, key: privateKeyPath } = parsedArgs;

const { encryptedSecret, data } = JSON.parse(
  fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
);

console.log(
  Buffer.from(
    new Uint8Array(
      await decryptData(
        Buffer.from(data, "base64"),
        Buffer.from(encryptedSecret, "base64"),
        fs.readFileSync(privateKeyPath)
      )
    )
  ).toString("utf8")
);
