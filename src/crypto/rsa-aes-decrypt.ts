import * as crypto from "crypto";
import { ASYMMETRIC_ALGO, SYMMETRIC_ALGO } from "./config.js";
import deriveKeyIv from "./deriveKeyIv.js";
import importRsaKey from "./importRsaKey.js";

const { subtle } = crypto.webcrypto as any as typeof window.crypto;

export async function decryptBallot(
  encryptedKey: string,
  saltedDataBase64: string,
  privateKeyASCII: BufferSource
) {
  const privateKey = await importRsaKey(privateKeyASCII, true);

  const saltedData = Buffer.from(saltedDataBase64, "base64");

  // TODO: check for MAGIC_NUMBER
  const encryptedData = saltedData.subarray(16);
  const salt = saltedData.subarray(8, 16);

  const secret = await subtle.decrypt(
    ASYMMETRIC_ALGO,
    privateKey,
    Buffer.from(encryptedKey, "base64")
  );

  const { iv, key } = await deriveKeyIv(secret, salt, "decrypt");

  return subtle.decrypt({ ...SYMMETRIC_ALGO, iv }, key, encryptedData);
}
