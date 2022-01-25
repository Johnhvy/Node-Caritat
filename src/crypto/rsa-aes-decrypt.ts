import * as crypto from "crypto";
import { ASYMMETRIC_ALGO, SYMMETRIC_ALGO } from "./config.js";
import deriveKeyIv from "./deriveKeyIv.js";
import importRsaKey from "./importRsaKey.js";

const { subtle } = crypto.webcrypto as any as typeof window.crypto;

export async function asymmetricDecrypt(
  privateKeyASCII: BufferSource,
  data: BufferSource
) {
  const privateKey = await importRsaKey(privateKeyASCII, true);
  return subtle.decrypt(ASYMMETRIC_ALGO, privateKey, data);
}

export async function symmetricDecrypt(
  secret: BufferSource,
  saltedData: BufferSource
) {
  if (ArrayBuffer.isView(saltedData)) saltedData = saltedData.buffer;

  const magicNumber = new DataView(saltedData);
  if (
    magicNumber.getInt8(0) !== 83 && // 'S'
    magicNumber.getInt8(1) !== 97 && // 'a'
    magicNumber.getInt8(2) !== 108 && // 'l'
    magicNumber.getInt8(3) !== 116 && // 't'
    magicNumber.getInt8(4) !== 101 && // 'e'
    magicNumber.getInt8(5) !== 100 && // 'd'
    magicNumber.getInt8(6) !== 95 && // '_'
    magicNumber.getInt8(7) !== 95 // '_'
  ) {
    throw new Error("Invalid magic number");
  }

  const salt = saltedData.slice(8, 16);
  const encryptedData = saltedData.slice(16);

  const { iv, key } = await deriveKeyIv(secret, salt, "decrypt");

  return subtle.decrypt({ ...SYMMETRIC_ALGO, iv }, key, encryptedData);
}

export default async function decryptData(
  encryptedKey: BufferSource,
  saltedData: BufferSource,
  privateKeyASCII: BufferSource
): Promise<ArrayBuffer> {
  const secret = await asymmetricDecrypt(privateKeyASCII, encryptedKey);
  return symmetricDecrypt(secret, saltedData);
}
