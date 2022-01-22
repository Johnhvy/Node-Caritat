import * as crypto from "crypto";
import { KEY_DERIVATION_ALGO, SYMMETRIC_ALGO } from "./config.js";
import importRsaKey from "./importRsaKey.js";

const { subtle, getRandomValues } =
  crypto.webcrypto as any as typeof window.crypto;

const MAGIC_NUMBER = new TextEncoder().encode("Salted__");

export default async function encryptBallot(
  ballot: BufferSource,
  publicKeyASCII: BufferSource
) {
  const secret = getRandomValues(new Uint32Array(1));
  const salt = getRandomValues(new Uint8Array(SYMMETRIC_ALGO.saltSize));

  const secretAsKey = await subtle.importKey(
    "raw",
    secret,
    KEY_DERIVATION_ALGO.name,
    false,
    ["deriveBits"]
  );

  const publicKey = await importRsaKey(publicKeyASCII);

  // encrypt as secret using rsa key
  const encryptedSecret = await subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    secret
  );

  const key_iv = await subtle.deriveBits(
    { ...KEY_DERIVATION_ALGO, salt },
    secretAsKey,
    8 * (KEY_DERIVATION_ALGO.ivSize + KEY_DERIVATION_ALGO.keySize)
  );

  const iv = new Uint8Array(key_iv, KEY_DERIVATION_ALGO.keySize);
  let algo = { ...SYMMETRIC_ALGO, iv };
  const key = await subtle.importKey(
    "raw",
    new Uint8Array(key_iv, 0, KEY_DERIVATION_ALGO.keySize),
    algo,
    false,
    ["encrypt"]
  );
  const data = await subtle.encrypt(algo, key, ballot);

  return {
    encryptedSecret,
    data: Uint8Array.of(...MAGIC_NUMBER, ...salt, ...new Uint8Array(data)),
  };
}
