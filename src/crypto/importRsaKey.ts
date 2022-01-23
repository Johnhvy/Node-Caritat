import * as crypto from "crypto";
import { ASYMMETRIC_ALGO } from "./config.js";

const { subtle } = crypto.webcrypto as any as typeof window.crypto;

const textDecoder = new TextDecoder();

export default function importRsaKey(
  pem: BufferSource | string,
  isPrivate?: boolean
) {
  const publicPrivate = isPrivate ? "PRIVATE" : "PUBLIC";
  const pemHeader = `-----BEGIN ${publicPrivate} KEY-----`;
  const pemFooter = `-----END ${publicPrivate} KEY-----`;

  return importKey(
    isPrivate ? "pkcs8" : "spki",
    pem,
    [isPrivate ? "decrypt" : "encrypt"],
    pemHeader.length,
    pemFooter.length
  );
}

function importKey(
  format: KeyFormat,
  pem: BufferSource | string,
  usage: KeyUsage[],
  pemHeaderLength: number,
  pemFooterLength: number
) {
  if (typeof pem !== "string") {
    pem = textDecoder.decode(pem);
  }
  const pemContents = pem
    .substring(pemHeaderLength, pem.length - pemFooterLength)
    .replace(/^\s+|\s+$/g, "");
  // base64 decode the string to get the binary data
  const binaryDer = Buffer.from(pemContents, "base64"); // TODO: do not use Node.js specific API here

  return subtle.importKey(
    format as any,
    binaryDer.slice(0, pem.length),
    ASYMMETRIC_ALGO,
    true,
    usage
  );
}
