import { ASYMMETRIC_ALGO } from "./config.js";

import { subtle } from "./webcrypto.js";

const textDecoder = new TextDecoder();

/*
Convert a string into an ArrayBuffer
from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function importKey(
  format: KeyFormat,
  pem: BufferSource | string,
  usage: KeyUsage[]
) {
  if (typeof pem !== "string") {
    pem = textDecoder.decode(pem);
  }
  const pemContents = pem.split("-----", 3)[2].replace(/\s+/g, "");
  // base64 decode the string to get the binary data
  const binaryDerString = atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  return subtle.importKey(
    format as any,
    binaryDer,
    ASYMMETRIC_ALGO,
    true,
    usage
  );
}

export default function importRsaKey(
  pem: BufferSource | string,
  isPrivate?: boolean
) {
  return importKey(isPrivate ? "pkcs8" : "spki", pem, [
    isPrivate ? "decrypt" : "encrypt",
  ]);
}
