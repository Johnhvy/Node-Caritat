import it from "node:test";
import { strict as assert } from "node:assert";

import CondorcetVote from "./CondorcetResult.js";

function condorcet(a, b) {
  return new CondorcetVote(null as any, a, "subject", b, {}).result;
}

it("should return an empty map for an empty vote", () => {
  let result = condorcet([], []);

  assert.strictEqual(result.size, 0);
});

it("should return a map for a vote", () => {
  let result = condorcet(
    ["a"],
    [
      {
        voter: { id: "1" },
        preferences: new Map([["a", 1]]),
      },
    ]
  );

  assert.deepStrictEqual([...result], [["a", 0]]);

  assert.deepStrictEqual(
    [
      ...condorcet(
        ["a", "b"],
        [
          {
            voter: { id: "1" },
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
  let result = condorcet(
    ["a"],
    [
      {
        voter: { id: "1" },
        preferences: new Map([["a", 1]]),
      },
      {
        voter: { id: "2" },
        preferences: new Map([["a", 1]]),
      },
    ]
  );

  assert.deepStrictEqual([...result], [["a", 0]]);
});

it("should return the correct result", () => {
  assert.deepStrictEqual(
    [
      ...condorcet(
        ["a", "b"],
        [
          {
            voter: { id: "1" },
            preferences: new Map([["a", 1]]),
          },
          {
            voter: { id: "2" },
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
  assert.deepStrictEqual(
    [
      ...condorcet(
        ["a", "b"],
        [
          {
            voter: { id: "1" },
            preferences: new Map([["b", 1]]),
          },
          {
            voter: { id: "2" },
            preferences: new Map([["b", 1]]),
          },
        ]
      ),
    ],
    [
      ["a", 0],
      ["b", 1],
    ]
  );
  assert.deepStrictEqual(
    [
      ...condorcet(
        ["a", "b"],
        [
          {
            voter: { id: "1" },
            preferences: new Map([["a", 1]]),
          },
          {
            voter: { id: "2" },
            preferences: new Map([["b", 1]]),
          },
          {
            voter: { id: "3" },
            preferences: new Map([["b", 1]]),
          },
        ]
      ),
    ],
    [
      ["a", 0],
      ["b", 1],
    ]
  );
  assert.deepStrictEqual(
    [
      ...condorcet(
        ["a", "b", "c"],
        [
          {
            voter: { id: "1" },
            preferences: new Map([
              ["a", 1],
              ["b", 0.5],
            ]),
          },
          {
            voter: { id: "2" },
            preferences: new Map([
              ["b", 1],
              ["c", 0.5],
            ]),
          },
          {
            voter: { id: "3" },
            preferences: new Map([
              ["c", 1],
              ["a", 0.5],
            ]),
          },
        ]
      ),
    ],
    [
      ["a", 1],
      ["b", 1],
      ["c", 1],
    ]
  );
  assert.deepStrictEqual(
    [
      ...condorcet(
        ["a", "b", "c"],
        [
          {
            voter: { id: "1" },
            preferences: new Map([
              ["a", 1],
              ["b", 0.5],
            ]),
          },
          {
            voter: { id: "2" },
            preferences: new Map([
              ["b", 1],
              ["a", 0.5],
            ]),
          },
          {
            voter: { id: "3" },
            preferences: new Map([
              ["c", 1],
              ["a", 0.5],
            ]),
          },
        ]
      ),
    ],
    [
      ["a", 2],
      ["b", 1],
      ["c", 0],
    ]
  );
});
