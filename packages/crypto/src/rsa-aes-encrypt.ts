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

export default async function encryptData(
  rawData: BufferSource,
  publicKeyASCII: BufferSource | string
) {
  const secret = await subtle.exportKey(
    "raw",
    await subtle.generateKey(SYMMETRIC_ALGO, true, ["encrypt"])
  );
  const salt = crypto.getRandomValues(new Uint8Array(SYMMETRIC_ALGO.saltSize));

  const publicKey = await importRsaKey(publicKeyASCII);

  // encrypt as secret using rsa key
  const encryptedSecret = (await subtle.encrypt(
    { name: ASYMMETRIC_ALGO.name },
    publicKey,
    secret
  )) as ArrayBuffer;

  const { iv, key } = await deriveKeyIv(secret, salt, "encrypt");
  const encryptedData = await subtle.encrypt(
    { ...SYMMETRIC_ALGO, iv },
    key,
    rawData
  );

  const data = new Uint8Array(
    MAGIC_NUMBER.length + SYMMETRIC_ALGO.saltSize + encryptedData.byteLength
  );
  data.set(MAGIC_NUMBER);
  data.set(salt, MAGIC_NUMBER.length);
  data.set(
    new Uint8Array(encryptedData),
    MAGIC_NUMBER.length + SYMMETRIC_ALGO.saltSize
  );

  return { encryptedSecret, data };
}
