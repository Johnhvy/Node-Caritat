import * as shamir from "@aduh95/caritat-crypto/shamir.js";
import { it } from "node:test";
import { strict as assert } from "node:assert";

const key = crypto.getRandomValues(new Uint8Array(256));
const shareHolders = 36;
const neededParts = 3;

const parts = shamir.split(key.buffer, shareHolders, neededParts);

it("should reconstruct single byte with enough shareholders", () => {
  const byte = key[0];
  const points = Array.from(
    shamir.generatePoints(byte, shareHolders, neededParts)
  );
  const reconstructed = shamir.reconstructByte(points);
  assert.strictEqual(reconstructed, byte);
});

it("should not give the whole key to any shareholders", () => {
  const byte = key[0];

  const points = Array.from(
    shamir.generatePoints(byte, shareHolders, neededParts)
  );

  let coincidences = 0;

  for (let i = 0; i < shareHolders; i++) {
    try {
      assert.notStrictEqual(points[i].y, byte);
    } catch (err) {
      if (err?.operator === "notStrictEqual") coincidences++;
    }
  }
  assert.ok(coincidences < neededParts - 1);
});

it("should not generate keys if shareholders is greater than threshold", () => {
  const byte = key[0];

  assert.throws(
    () => {
      shamir.generatePoints(byte, 256, neededParts).next();
    },
    {
      message:
        "Expected 256 <= 255. Cannot have more than shareholders the size of the Gallois field",
    }
  );
});

it("should not generate keys if less shareholders than needed parts", () => {
  const byte = key[0];

  assert.throws(
    () => {
      shamir.generatePoints(byte, 10, 25).next();
    },
    {
      message:
        "Expected 10 < 25. Cannot have more less shareholders than needed parts",
    }
  );
});

it("should reconstruct key from enough shareholders", () => {
  const reconstructed = shamir.reconstruct([parts[1], parts[0], parts[5]]);
  assert.deepStrictEqual(reconstructed, key);
});

it("should fail reconstruct key from not enough shareholders", () => {
  const reconstructed = shamir.reconstruct([parts[1], parts[5]]);
  assert.notDeepStrictEqual(reconstructed, key);
});

it("should fail reconstruct key with duplicate shareholders", () => {
  assert.throws(
    () => {
      shamir.reconstruct([parts[1], parts[5], parts[1]]);
    },
    { message: "Div/0" }
  );
});

it("should still reconstruct key with too many shareholders", () => {
  const reconstructed = shamir.reconstruct(parts);
  assert.deepStrictEqual(reconstructed, key);
});

it(
  "should reconstruct key faster when specifying neededParts",
  { skip: (shareHolders as number) === (neededParts as number) },
  () => {
    const s1 = performance.now();
    const reconstructed1 = shamir.reconstruct(parts, neededParts);
    const t1 = performance.now() - s1;

    const s2 = performance.now();
    const reconstructed2 = shamir.reconstruct(parts);
    const t2 = performance.now() - s2;

    assert.deepStrictEqual(reconstructed1, key);
    assert.deepStrictEqual(reconstructed2, key);

    assert.ok(t2 >= t1);
  }
);
