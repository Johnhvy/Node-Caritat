#!/usr/bin/env node

import * as path from "path";
import * as fs from "fs";

import parsedArgs from "../utils/parsedArgs.js";
import encryptBallot from "../crypto/rsa-aes-encrypt.js";

const filePath =
  parsedArgs["file"] ??
  parsedArgs["f"] ??
  path.join(process.cwd(), "ballot.yml");
const publicKeyPath =
  parsedArgs["key"] ??
  parsedArgs["k"] ??
  path.join(process.cwd(), "public.pem");

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
