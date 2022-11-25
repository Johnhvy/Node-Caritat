import assert from "node:assert";
import { it } from "node:test";
import generate from "../src/generateRSAKeyPair.js";

it("should generate a key pair alongside a secret", async () => {
  const obj = await generate();
  assert.deepStrictEqual(Reflect.ownKeys(obj), [
    "encryptedPrivateKey",
    "publicKey",
    "secret",
  ]);
  assert.ok(obj.encryptedPrivateKey instanceof ArrayBuffer);
  assert.ok(obj.publicKey instanceof ArrayBuffer);
  assert.ok(obj.secret instanceof ArrayBuffer);
});
