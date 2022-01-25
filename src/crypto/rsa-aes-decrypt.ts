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
  let offset = 0;
  const { byteLength } = saltedData;
  if (ArrayBuffer.isView(saltedData)) {
    offset = saltedData.byteOffset;
    saltedData = saltedData.buffer;
  }

  const magicNumber = new DataView(saltedData);
  if (
    magicNumber.getInt8(offset + 0) !== 83 && // 'S'
    magicNumber.getInt8(offset + 1) !== 97 && // 'a'
    magicNumber.getInt8(offset + 2) !== 108 && // 'l'
    magicNumber.getInt8(offset + 3) !== 116 && // 't'
    magicNumber.getInt8(offset + 4) !== 101 && // 'e'
    magicNumber.getInt8(offset + 5) !== 100 && // 'd'
    magicNumber.getInt8(offset + 6) !== 95 && // '_'
    magicNumber.getInt8(offset + 7) !== 95 // '_'
  ) {
    throw new Error("Invalid magic number");
  }

  const salt = saltedData.slice(offset + 8, offset + 16);
  const encryptedData = saltedData.slice(offset + 16, offset + byteLength);

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
