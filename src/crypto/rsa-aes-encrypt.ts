import * as crypto from "crypto";
import { ASYMMETRIC_ALGO, SYMMETRIC_ALGO } from "./config.js";
import deriveKeyIv from "./deriveKeyIv.js";
import importRsaKey from "./importRsaKey.js";

const { subtle, getRandomValues } =
  crypto.webcrypto as any as typeof window.crypto;

const MAGIC_NUMBER = new TextEncoder().encode("Salted__");

export default async function encryptBallot(
  rawData: BufferSource,
  publicKeyASCII: BufferSource
) {
  const secret = await subtle.exportKey(
    "raw",
    await subtle.generateKey(SYMMETRIC_ALGO, true, [])
  );
  const salt = getRandomValues(new Uint8Array(SYMMETRIC_ALGO.saltSize));

  const publicKey = await importRsaKey(publicKeyASCII);

  // encrypt as secret using rsa key
  const encryptedSecret = await subtle.encrypt(
    { name: ASYMMETRIC_ALGO.name },
    publicKey,
    secret
  );

  const { iv, key } = await deriveKeyIv(secret, salt, "encrypt");
  const data = await subtle.encrypt({ ...SYMMETRIC_ALGO, iv }, key, rawData);

  return {
    encryptedSecret,
    data: Uint8Array.of(...MAGIC_NUMBER, ...salt, ...new Uint8Array(data)),
  };
}
