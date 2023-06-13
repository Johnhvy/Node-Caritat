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

const armorStart = "-----BEGIN P";
function isArmoredMessage(pem: BufferSource) {
  const isView = ArrayBuffer.isView(pem);
  const firstBytes = new DataView(
    isView ? pem.buffer : pem,
    isView ? pem.byteOffset : 0,
    armorStart.length
  );
  for (let i = 0; i < armorStart.length; i++) {
    if (armorStart.charCodeAt(i) !== firstBytes.getUint8(i)) return false;
  }
  return true;
}

function importKey(
  format: Exclude<KeyFormat, "jwk">,
  pem: BufferSource | string,
  usage: KeyUsage[]
) {
  let binaryDer;
  if (
    typeof pem === "string" ? pem.startsWith(armorStart) : isArmoredMessage(pem)
  ) {
    if (typeof pem !== "string") {
      pem = textDecoder.decode(pem);
    }
    const pemContents = pem.split("-----", 3)[2].replace(/\s+/g, "");
    // base64 decode the string to get the binary data
    const binaryDerString = atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    binaryDer = str2ab(binaryDerString);
  } else {
    binaryDer = pem;
  }

  return subtle.importKey(format, binaryDer, ASYMMETRIC_ALGO, true, usage);
}

export default function importRsaKey(
  pem: BufferSource | string,
  isPrivate?: boolean
) {
  return importKey(isPrivate ? "pkcs8" : "spki", pem, [
    isPrivate ? "decrypt" : "encrypt",
  ]);
}
