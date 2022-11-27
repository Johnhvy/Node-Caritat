import assert from "node:assert";
import { it } from "node:test";

import { generateAndSplitKeyPair } from "../src/generateRSAKeyPair.js";
import { reconstructPrivateKey } from "../src/reconstructPrivateKey.js";
import decryptData from "../src/rsa-aes-decrypt.js";
import encryptData from "../src/rsa-aes-encrypt.js";

it("should handle no secret splitting", async () => {
  const { shares, encryptedPrivateKey, publicKey } =
    await generateAndSplitKeyPair(2, 1);

  assert.strictEqual(shares.length, 2);
  assert.deepStrictEqual(shares[0], shares[1]);

  const data = crypto.getRandomValues(new Uint32Array(8));
  const { encryptedSecret, saltedCiphertext } = await encryptData(
    data,
    publicKey
  );

  const privateKey = await reconstructPrivateKey(
    encryptedPrivateKey,
    shares,
    1
  );
  const result = await decryptData(
    encryptedSecret,
    saltedCiphertext,
    privateKey
  );

  assert.deepStrictEqual(new Uint32Array(result), data);
});

it("should handle no secret splitting when only one share is given", async () => {
  const { shares, encryptedPrivateKey, publicKey } =
    await generateAndSplitKeyPair(2, 1);

  assert.strictEqual(shares.length, 2);
  assert.deepStrictEqual(shares[0], shares[1]);

  const data = crypto.getRandomValues(new Uint32Array(8));
  const { encryptedSecret, saltedCiphertext } = await encryptData(
    data,
    publicKey
  );

  const privateKey = await reconstructPrivateKey(
    encryptedPrivateKey,
    shares.slice(1)
  );
  const result = await decryptData(
    encryptedSecret,
    saltedCiphertext,
    privateKey
  );

  assert.deepStrictEqual(new Uint32Array(result), data);
});

it("should handle splitting", async () => {
  const { shares, encryptedPrivateKey, publicKey } =
    await generateAndSplitKeyPair(5, 2);

  assert.strictEqual(shares.length, 5);

  const data = crypto.getRandomValues(new Uint32Array(8));
  const { encryptedSecret, saltedCiphertext } = await encryptData(
    data,
    publicKey
  );

  for (let i = 0; i < 5; i++)
    // Ensure that no shareholder holds the full secret.
    await assert.rejects(
      reconstructPrivateKey(encryptedPrivateKey, [shares[i]])
    );

  const privateKey = await reconstructPrivateKey(encryptedPrivateKey, shares);

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const promise = reconstructPrivateKey(encryptedPrivateKey, [
        shares[i],
        shares[j],
      ]);
      if (i === j) {
        // Cannot reconstruct the secret by giving twice the same share.
        await assert.rejects(promise);
      } else {
        // Any pair of shares should reconstruct the same secret.
        assert.deepStrictEqual(await promise, privateKey);
      }
    }
  }
  const result = await decryptData(
    encryptedSecret,
    saltedCiphertext,
    privateKey
  );

  assert.deepStrictEqual(new Uint32Array(result), data);
});
