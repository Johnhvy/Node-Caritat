export const SYMMETRIC_ALGO = { name: "AES-CBC", length: 256, saltSize: 8 };
export const KEY_DERIVATION_ALGO = {
  name: "PBKDF2",
  hash: "SHA-256",
  iterations: 100_000,

  keySize: 32,
  ivSize: 16,
};
