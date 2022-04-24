import it from "node:test";
import { strict as assert } from "node:assert";

import type { Actor } from "../dist/vote";
import getParticipation from "../dist/utils/participation.js";

const authorizedVoters = Array.from(
  { length: 10 },
  (_, i) =>
    ({
      id: i.toString(),
    } as Actor)
);

it("should find 100% participation if no voters list", () => {
  assert.strictEqual(getParticipation([], 0), 1);
  assert.strictEqual(getParticipation([], 1), 1);
});

it("should find the participation for one voter", () => {
  assert.strictEqual(getParticipation([{ id: "a" }], 0), 0);
  assert.strictEqual(getParticipation([{ id: "a" }], 1), 1);
});

it("should find the participation for 10 voters", () => {
  for (let i = 0; i < 10; i++) {
    assert.strictEqual(getParticipation(authorizedVoters, i), i / 10);
  }
});

it("should throw error if the participation is more than 100%", () => {
  assert.throws(
    () => getParticipation([{ id: "a" }], 2),
    /More ballots than authorized voters/
  );
  assert.throws(
    () => getParticipation(authorizedVoters, 11),
    /More ballots than authorized voters/
  );
});
