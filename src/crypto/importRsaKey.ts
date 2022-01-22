import * as crypto from "crypto";

const { subtle } = crypto.webcrypto as any as typeof window.crypto;

export default function importRsaKey(pem) {
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
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}
