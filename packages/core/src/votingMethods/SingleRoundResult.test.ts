import it from "node:test";
import { strict as assert } from "node:assert";

import SingleRound from "./SingleRoundResult.js";
import type { Actor, Ballot } from "../vote.js";

function singleRound(a: string[], b: Ballot[]) {
  return new SingleRound(null as Actor[], a, "subject", b, {}).result;
}

it("should return an empty map for an empty vote", () => {
  const result = singleRound([], []);

  assert.strictEqual(result.size, 0);
});

it("should return a map for a vote", () => {
  const result = singleRound(
    ["a"],
    [
      {
        voter: { id: "b" },
        preferences: new Map([["a", 1]]),
      },
    ]
  );

  assert.deepStrictEqual([...result], [["a", 1]]);

  assert.deepStrictEqual(
    [
      ...singleRound(
        ["a", "b"],
        [
          {
            voter: { id: "b" },
            preferences: new Map([["a", 1]]),
          },
        ]
      ),
    ],
    [
      ["a", 1],
      ["b", 0],
    ]
  );
});

it("should return a map for two votes", () => {
  const result = singleRound(
    ["a"],
    [
      {
        voter: { id: "b" },
        preferences: new Map([["a", 1]]),
      },
      {
        voter: { id: "c" },
        preferences: new Map([["a", 1]]),
      },
    ]
  );

  assert.deepStrictEqual([...result], [["a", 2]]);
});
