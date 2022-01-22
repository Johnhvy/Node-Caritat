import * as crypto from "crypto";
import * as path from "path";
import * as minimist from "minimist";
import * as fs from "fs";

const { subtle, getRandomValues } =
  crypto.webcrypto as any as typeof window.crypto;

const hash = "SHA-256";
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

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

async function encryptBallot(
  ballot: BufferSource,
  publicKeyASCII: BufferSource
) {
  const secret = getRandomValues(new Uint32Array(1));
  const salt = getRandomValues(new Uint8Array(8));

  const secretAsKey = await subtle.importKey("raw", secret, "PBKDF2", false, [
    "deriveBits",
  ]);

  const publicKey = await importRsaKey(publicKeyASCII);

  // encrypt as secret using rsa key
  const encryptedSecret = await subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    secret
  );

  const key_iv = await subtle.deriveBits(
    {
      name: "PBKDF2",
      hash,
      salt,
      iterations: 100_000,
    },
    secretAsKey,
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
  const data = await subtle.encrypt(algo, key, ballot);

  return {
    encryptedSecret,
    data: Uint8Array.of(
      ...textEncoder.encode("Salted__"),
      ...salt,
      ...new Uint8Array(data)
    ),
  };
}

function importRsaKey(pem) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pem
    .toString("ascii")
    .substring(pemHeader.length, pem.length - pemFooter.length)
    .split("\n")
    .join("");
  // base64 decode the string to get the binary data
  const binaryDer = Buffer.from(pemContents, "base64"); // TODO: do not use Node.js specific API here

  return subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash,
    },
    true,
    ["encrypt"]
  );
}

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
