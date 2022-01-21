import * as crypto from "crypto";
import * as path from "path";
import * as minimist from "minimist";
import * as fs from "fs";

const { subtle, getRandomValues } =
  crypto.webcrypto as any as typeof window.crypto;

const parsedArgs = (minimist as any as { default: typeof minimist }).default(
  process.argv
);
const filePath =
  parsedArgs["file"] ??
  parsedArgs["f"] ??
  path.join(process.cwd(), "ballot.yml");
const publicKeyPath =
  parsedArgs["key"] ??
  parsedArgs["k"] ??
  path.join(process.cwd(), "public.pem");

const ec = new TextEncoder();
const ed = new TextDecoder();

// const publicKey = crypto.createPublicKey(fs.readFileSync(publicKeyPath));

const keyData = fs.readFileSync(publicKeyPath);
const data = fs.readFileSync(filePath);

// from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str[i];
  }
  return buf;
}

function importRsaKey(pem) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length
  );
  // base64 decode the string to get the binary data
  const binaryDer = Buffer.from(pemContents, "base64");

  return subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

const publicKey = await importRsaKey(keyData.toString("utf-8"));

const salt = getRandomValues(new Uint8Array(8));
const pass = getRandomValues(new Uint8Array(32));

const secret = await subtle.importKey("raw", pass, "PBKDF2", false, [
  "deriveBits",
]);
const key_iv = await subtle.deriveBits(
  {
    name: "PBKDF2",
    hash: "SHA-512",
    salt,
    iterations: 10_000,
  },
  secret,
  8 * (32 + 16)
);

const iv = new Uint8Array(key_iv, 32);
let algo = { name: "AES-CBC", iv, length: 256 };
const key = await subtle.importKey(
  "raw",
  new Uint8Array(key_iv, 0, 32),
  algo,
  false,
  ["encrypt"]
);

const encryptedSecret = await subtle.encrypt(
  { name: "RSA-OAEP" },
  publicKey,
  pass
);

let encryptedBallot: ArrayBuffer = await subtle.encrypt(algo, key, data);

//  cypher.update(data);

console.log(
  JSON.stringify({
    key: Buffer.from(encryptedSecret).toString("base64"),
    data: Buffer.concat([
      Buffer.from("Salted__"),
      salt,
      Buffer.from(encryptedBallot),
    ]).toString("base64"),
  })
);
