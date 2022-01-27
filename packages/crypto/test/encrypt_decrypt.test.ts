/// <reference types="jest" />

import * as fs from "fs";
import * as crypto from "crypto";
import encryptBallot from "../dist/rsa-aes-encrypt.js";
import decryptBallot from "../dist/rsa-aes-decrypt.js";

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
  expect(encryptedData.encryptedSecret.byteLength).toBeGreaterThan(0);
  expect(encryptedData.data.byteLength).toBeGreaterThan(0);
});

it("should be able to correctly decrypt what it has encrypted", async () => {
  const encryptedData = await encryptBallot(rawData, publicKey);

  const decryptedData = await decryptBallot(
    encryptedData.encryptedSecret,
    encryptedData.data,
    privateKey
  );

  expect(Array.from(new Uint32Array(decryptedData))).toStrictEqual(
    Array.from(new Uint32Array(rawData))
  );
});
