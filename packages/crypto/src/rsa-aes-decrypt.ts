import { ASYMMETRIC_ALGO, SYMMETRIC_ALGO } from "./config.js";
import deriveKeyIv from "./deriveKeyIv.js";
import importRsaKey from "./importRsaKey.js";

import { subtle } from "./webcrypto.js";

export async function asymmetricDecrypt(
  privateKeyASCII: BufferSource,
  ciphertext: BufferSource
) {
  const privateKey = await importRsaKey(privateKeyASCII, true);
  return subtle.decrypt(ASYMMETRIC_ALGO, privateKey, ciphertext);
}

export async function symmetricDecrypt(
  secret: BufferSource,
  saltedCiphertext: BufferSource
) {
  let offset = 0;
  const { byteLength } = saltedCiphertext;
  if (ArrayBuffer.isView(saltedCiphertext)) {
    offset = saltedCiphertext.byteOffset;
    saltedCiphertext = saltedCiphertext.buffer;
  }

  const magicNumber = new DataView(saltedCiphertext);
  if (
    magicNumber.getInt8(offset + 0) !== 83 || // 'S'
    magicNumber.getInt8(offset + 1) !== 97 || // 'a'
    magicNumber.getInt8(offset + 2) !== 108 || // 'l'
    magicNumber.getInt8(offset + 3) !== 116 || // 't'
    magicNumber.getInt8(offset + 4) !== 101 || // 'e'
    magicNumber.getInt8(offset + 5) !== 100 || // 'd'
    magicNumber.getInt8(offset + 6) !== 95 || // '_'
    magicNumber.getInt8(offset + 7) !== 95 // '_'
  ) {
    throw new Error("Invalid magic number");
  }

  const salt = saltedCiphertext.slice(offset + 8, offset + 16);
  const ciphertext = saltedCiphertext.slice(offset + 16, offset + byteLength);

  const { iv, key } = await deriveKeyIv(secret, salt, "decrypt");

  return subtle.decrypt({ ...SYMMETRIC_ALGO, iv }, key, ciphertext);
}

export default async function decryptData(
  encryptedSecret: BufferSource,
  saltedCiphertext: BufferSource,
  privateKeyASCII: BufferSource
): Promise<ArrayBuffer> {
  const secret = await asymmetricDecrypt(privateKeyASCII, encryptedSecret);
  return symmetricDecrypt(secret, saltedCiphertext);
}
