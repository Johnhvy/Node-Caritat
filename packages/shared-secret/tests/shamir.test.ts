import * as shamir from "../src/shamir.ts";
import { it } from "node:test";
import { strict as assert } from "node:assert";

const key = crypto.getRandomValues(new Uint8Array(256));
const shareHolders = 36;
const neededParts = 3;

const parts = shamir.splitKey(key.buffer, shareHolders, neededParts);

it("should reconstruct keypart from enough shareholders", () => {
  let byte = key[0];
  let points = Array.from(
    shamir.generatePoints(byte, shareHolders, neededParts)
  );
  let reconstructed = shamir.reconstructByte(points);
  assert.ok(reconstructed === byte);
});

it("should reconstruct key from enough shareholders", () => {
  let reconstructed = Uint8Array.from(
    shamir.reconstructKey([parts[1], parts[0], parts[5]])
  );
  for (let i = 0; i < key.length; i++) {
    assert.ok(reconstructed[i] === key[i]);
  }
});

it("should fail reconstruct key from enough shareholders", () => {
  let reconstructed = Uint8Array.from(
    shamir.reconstructKey([parts[1], parts[5]])
  );
  let b = true;
  for (let i = 0; i < key.length; i++) {
    b &&= reconstructed[i] === key[i];
  }
  assert.ok(!b);
});

it("should fail reconstruct key with duplicate shareholders", () => {
  try {
    let reconstructed = Uint8Array.from(
      shamir.reconstructKey([parts[1], parts[5], parts[1]])
    );
    let b = true;
    for (let i = 0; i < key.length; i++) {
      b &&= reconstructed[i] === key[i];
    }
    assert.ok(!b);
  } catch (e) {
    assert.ok(e.message == "Div/0");
  }
});

it("should still reconstruct key with too many shareholders", () => {
  let reconstructed = Uint8Array.from(shamir.reconstructKey(parts));
  for (let i = 0; i < key.length; i++) {
    assert.ok(reconstructed[i] === key[i]);
  }
});

it("should reconstruct key faster when specifying neededParts", () => {
  if (shareHolders as number === neededParts as number) {
    assert.ok(true);
    return;
  }

  let s1 = performance.now();
  let reconstructed1 = Uint8Array.from(
    shamir.reconstructKey(parts, neededParts)
  );
  let t1 = performance.now() - s1;

  let s2 = performance.now();
  let reconstructed2 = Uint8Array.from(shamir.reconstructKey(parts));
  let t2 = performance.now() - s2;

  for (let i = 0; i < key.length; i++) {
    assert.ok(reconstructed1[i] === key[i]);
  }
  for (let i = 0; i < key.length; i++) {
    assert.ok(reconstructed2[i] === key[i]);
  }
  assert.ok(t2 >= t1);
});
