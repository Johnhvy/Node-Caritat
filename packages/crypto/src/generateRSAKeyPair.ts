import { ASYMMETRIC_ALGO, SYMMETRIC_ALGO } from "./config.js";
import deriveKeyIv from "./deriveKeyIv.js";

import encryptData from "./rsa-aes-encrypt.js";
import crypto from "./webcrypto.js";

export default async function generateRSAKeyPair() {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    {
      ...ASYMMETRIC_ALGO,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ["encrypt", "decrypt"]
  );
  const secret = await crypto.subtle.exportKey(
    "raw",
    await crypto.subtle.generateKey(SYMMETRIC_ALGO, true, ["encrypt"])
  );
  const salt = crypto.getRandomValues(new Uint8Array(SYMMETRIC_ALGO.saltSize));
  const { iv, key } = await deriveKeyIv(secret, salt, "encrypt");
  const encryptedPrivateKey = await crypto.subtle.encrypt(
    { ...SYMMETRIC_ALGO, iv },
    key,
    await crypto.subtle.exportKey("pkcs8", privateKey)
  );
  return {
    encryptedPrivateKey,
    publicKey: await crypto.subtle.exportKey("spki", publicKey),
    // TODO: we want to split this secret between shareholders.
    secret,
  };
}

async function shareSecret(secretHolders: ArrayBuffer[]) {
  const { encryptedPrivateKey, publicKey, secret } = await generateRSAKeyPair();
  if (secretHolders.length === 1) {
    return {
      encryptedPrivateKey,
      publicKey,
      secret: [encryptData(secretHolders[0])],
    };
  } else {
    return {
      encryptedPrivateKey,
      publicKey,
      secret: shamirSecret(secretHolders),
    };
  }
}
