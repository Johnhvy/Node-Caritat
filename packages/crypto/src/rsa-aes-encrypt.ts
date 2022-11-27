import { ASYMMETRIC_ALGO, SYMMETRIC_ALGO } from "./config.js";
import deriveKeyIv from "./deriveKeyIv.js";
import importRsaKey from "./importRsaKey.js";

import crypto, { subtle } from "./webcrypto.js";

const MAGIC_NUMBER = [
  83, // 'S'
  97, // 'a'
  108, // 'l'
  116, // 't'
  101, // 'e'
  100, // 'd'
  95, // '_'
  95, // '_'
];

export async function symmetricEncrypt(rawData: BufferSource) {
  const secret = await subtle.exportKey(
    "raw",
    await subtle.generateKey(SYMMETRIC_ALGO, true, ["encrypt"])
  );
  const salt = crypto.getRandomValues(new Uint8Array(SYMMETRIC_ALGO.saltSize));

  const { iv, key } = await deriveKeyIv(secret, salt, "encrypt");
  const ciphertext = await subtle.encrypt(
    { ...SYMMETRIC_ALGO, iv },
    key,
    rawData
  );

  const saltedCiphertext = new Uint8Array(
    MAGIC_NUMBER.length + SYMMETRIC_ALGO.saltSize + ciphertext.byteLength
  );
  saltedCiphertext.set(MAGIC_NUMBER);
  saltedCiphertext.set(salt, MAGIC_NUMBER.length);
  saltedCiphertext.set(
    new Uint8Array(ciphertext),
    MAGIC_NUMBER.length + SYMMETRIC_ALGO.saltSize
  );

  return { secret, saltedCiphertext };
}

export default async function encryptData(
  rawData: BufferSource,
  publicKeyASCII: BufferSource | string
) {
  const publicKey = await importRsaKey(publicKeyASCII);

  const { saltedCiphertext, secret } = await symmetricEncrypt(rawData);

  // encrypt as secret using rsa key
  const encryptedSecret = (await subtle.encrypt(
    { name: ASYMMETRIC_ALGO.name },
    publicKey,
    secret
  )) as ArrayBuffer;

  return { encryptedSecret, saltedCiphertext };
}
