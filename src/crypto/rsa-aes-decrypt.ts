import * as crypto from "crypto";
import { ASYMMETRIC_ALGO, SYMMETRIC_ALGO } from "./config.js";
import deriveKeyIv from "./deriveKeyIv.js";
import importRsaKey from "./importRsaKey.js";

const { subtle } = crypto.webcrypto as any as typeof window.crypto;

export default async function decryptData(
  encryptedKey: BufferSource,
  saltedData: BufferSource,
  privateKeyASCII: BufferSource
): Promise<ArrayBuffer> {
  const privateKey = await importRsaKey(privateKeyASCII, true);

  // TODO: check for MAGIC_NUMBER

  if (ArrayBuffer.isView(saltedData)) saltedData = saltedData.buffer;
  const salt = saltedData.slice(8, 16);
  const encryptedData = saltedData.slice(16);

  const secret = await subtle.decrypt(
    ASYMMETRIC_ALGO,
    privateKey,
    encryptedKey
  );

  const { iv, key } = await deriveKeyIv(secret, salt, "decrypt");

  return subtle.decrypt({ ...SYMMETRIC_ALGO, iv }, key, encryptedData);
}
