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

  const magicNumber = new DataView(saltedCiphertext, offset, 8);
  if (
    magicNumber.getInt8(0) !== 0x53 || // 'S'
    magicNumber.getInt8(1) !== 0x61 || // 'a'
    magicNumber.getInt8(2) !== 0x6c || // 'l'
    magicNumber.getInt8(3) !== 0x74 || // 't'
    magicNumber.getInt8(4) !== 0x65 || // 'e'
    magicNumber.getInt8(5) !== 0x64 || // 'd'
    magicNumber.getInt8(6) !== 0x5f || // '_'
    magicNumber.getInt8(7) !== 0x5f || // '_'
    false
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
