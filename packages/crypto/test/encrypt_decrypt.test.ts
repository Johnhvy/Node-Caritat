import it from "node:test";
import { strict as assert } from "node:assert";

import * as fs from "node:fs";
import * as crypto from "node:crypto";
import encryptBallot from "@aduh95/caritat-crypto/encrypt";
import decryptBallot from "@aduh95/caritat-crypto/decrypt";

const fixturesURL = new URL("../../../test/fixtures/", import.meta.url);

const publicKeyURL = new URL("./public.pem", fixturesURL);
const privateKeyURL = new URL("./key.pem", fixturesURL);

// const textEncoder = new TextEncoder();
// const textDecoder = new TextDecoder();

const rawData = crypto.randomBytes(128).buffer;

const publicKey = fs.readFileSync(publicKeyURL).toString("utf-8");
const privateKey = fs.readFileSync(privateKeyURL);

it("should encrypt input", async () => {
  const encryptedData = await encryptBallot(rawData, publicKey);
  assert.ok(encryptedData.encryptedSecret.byteLength > 0);
  assert.ok(encryptedData.saltedCiphertext.byteLength > 0);
});

it("should be able to correctly decrypt what it has encrypted", async () => {
  const encryptedData = await encryptBallot(rawData, publicKey);

  const decryptedData = await decryptBallot(
    encryptedData.saltedCiphertext,
    encryptedData.encryptedSecret,
    privateKey
  );

  assert.deepStrictEqual(
    Array.from(new Uint32Array(decryptedData)),
    Array.from(new Uint32Array(rawData))
  );
});
