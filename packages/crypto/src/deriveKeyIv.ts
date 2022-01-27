import * as crypto from "crypto";
import { KEY_DERIVATION_ALGO, SYMMETRIC_ALGO } from "./config.js";

const { subtle } = crypto.webcrypto as any as typeof window.crypto;

export default async function deriveKeyIv(
  secret: BufferSource,
  salt: BufferSource,
  ...usage: KeyUsage[]
) {
  const secretKey = await subtle.importKey(
    "raw",
    secret,
    KEY_DERIVATION_ALGO.name,
    false,
    ["deriveBits"]
  );

  const key_iv = await subtle.deriveBits(
    { ...KEY_DERIVATION_ALGO, salt },
    secretKey,
    8 * (KEY_DERIVATION_ALGO.ivSize + KEY_DERIVATION_ALGO.keySize)
  );

  const key = await subtle.importKey(
    "raw",
    new Uint8Array(key_iv, 0, KEY_DERIVATION_ALGO.keySize),
    SYMMETRIC_ALGO,
    false,
    usage
  );
  const iv = new Uint8Array(key_iv, KEY_DERIVATION_ALGO.keySize);

  return { key, iv };
}
