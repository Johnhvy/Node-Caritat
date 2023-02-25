import assert from "node:assert";
import { it } from "node:test";

import { generateRSAKeyPair } from "@aduh95/caritat-crypto/generateSplitKeyPair";
import encryptData from "@aduh95/caritat-crypto/encrypt";
import decryptData, { symmetricDecrypt } from "@aduh95/caritat-crypto/decrypt";

it("should generate a key pair alongside a secret", async () => {
  const obj = await generateRSAKeyPair();
  assert.deepStrictEqual(Reflect.ownKeys(obj), [
    "encryptedPrivateKey",
    "publicKey",
    "secret",
  ]);
  assert.ok(obj.encryptedPrivateKey instanceof Uint8Array);
  assert.ok(obj.publicKey instanceof ArrayBuffer);
  assert.ok(obj.secret instanceof ArrayBuffer);
});

it("should be able to decipher an encrypted message", async () => {
  const { publicKey, secret, encryptedPrivateKey } = await generateRSAKeyPair();
  const data = crypto.getRandomValues(new Uint32Array(8));
  const { encryptedSecret, saltedCiphertext } = await encryptData(
    data,
    publicKey
  );

  const privateKey = await symmetricDecrypt(encryptedPrivateKey, secret);
  const result = await decryptData(
    saltedCiphertext,
    encryptedSecret,
    privateKey
  );

  assert.deepStrictEqual(new Uint32Array(result), data);
});
