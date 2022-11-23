import * as shamir from "../src/shamir.ts";
import { it } from "node:test";
import { strict as assert } from "node:assert";

let key = crypto.getRandomValues(new Uint8Array(256));
let shareHolders = 30;
let neededParts = 3;

it("should reconstruct keypart from enough shareholders", () => {
  let part = Math.floor(Math.random() * 255);
  let points = Array.from(
    shamir.generatePoints(part, shareHolders, neededParts)
  );
  let reconstructed = shamir.reconstructByte(points);
  assert.ok(reconstructed === part);
});

it("should reconstruct key from enough shareholders", () => {
  let parts = shamir.splitKey(key.buffer, shareHolders, neededParts);
  let reconstructed = Uint8Array.from(
    shamir.reconstructKey([parts[1], parts[0], parts[5]])
  );
  for (let i = 0; i < key.length; i++) {
    assert.ok(reconstructed[i] === key[i]);
  }
});

it("should fail reconstruct key from enough shareholders", () => {
  let parts = shamir.splitKey(key.buffer, shareHolders, neededParts);
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
  let parts = shamir.splitKey(key.buffer, shareHolders, neededParts);
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
  let parts = shamir.splitKey(key.buffer, shareHolders, neededParts);
  let reconstructed = Uint8Array.from(shamir.reconstructKey(parts));
  for (let i = 0; i < key.length; i++) {
    assert.ok(reconstructed[i] === key[i]);
  }
});

it("should reconstruct key faster when specifying neededParts", () => {
  if (shareHolders === neededParts) {
    assert.ok(true);
    return;
  }

  let parts = shamir.splitKey(key.buffer, shareHolders, neededParts);

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
