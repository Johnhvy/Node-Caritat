import { ASYMMETRIC_ALGO } from "./config.js";

import { symmetricEncrypt } from "./rsa-aes-encrypt.js";
import crypto from "./webcrypto.js";
const shamir = { split: Function.prototype }; // TODO: import actual Shamir secret sharing implementation.

export async function generateRSAKeyPair() {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    {
      ...ASYMMETRIC_ALGO,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ["encrypt", "decrypt"]
  );
  const [{ saltedCiphertext: encryptedPrivateKey, secret }, rawPublicKey] =
    await Promise.all([
      symmetricEncrypt(await crypto.subtle.exportKey("pkcs8", privateKey)),
      crypto.subtle.exportKey("spki", publicKey),
    ]);
  return {
    encryptedPrivateKey,
    publicKey: rawPublicKey,
    secret,
  };
}

export async function generateAndSplitKeyPair(
  shareHolders: ArrayBuffer[],
  threshold: number
) {
  const { encryptedPrivateKey, publicKey, secret } = await generateRSAKeyPair();
  if (threshold === 1) {
    // We can give the secret directly to each share holder.
    return {
      encryptedPrivateKey,
      publicKey,
      secret: Array(shareHolders.length).fill(secret),
    };
  } else {
    return {
      encryptedPrivateKey,
      publicKey,
      secret: shamir.split(secret, shareHolders.length, threshold),
    };
  }
}
