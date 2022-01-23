#!/usr/bin/env node

import fs from "fs";

import parsedArgs from "../utils/parsedArgs.js";
import { decryptBallot } from "../crypto/rsa-aes-decrypt.js";

const filePath = parsedArgs["data"] ?? parsedArgs["d"];
const privateKeyPath = parsedArgs["key"] ?? parsedArgs["k"];

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
