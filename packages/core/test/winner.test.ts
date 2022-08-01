import it from "node:test";
import { strict as assert } from "node:assert";

import { VoteCandidate } from "../src/vote.js";
import VoteResult from "../src/votingMethods/VoteResult.js";
import type { CandidateScores } from "../src/votingMethods/VoteResult";

function findWinners(
  result: CandidateScores
): Generator<VoteCandidate, void, unknown> {
  return Reflect.apply(VoteResult.prototype.findWinners, { result }, []);
}

it("should find the winner based on the scores of the candidates", () => {
  assert.deepStrictEqual(
    Array.from(
      findWinners(
        new Map([
          ["a", 2],
          ["b", 1],
          ["c", 0],
        ])
      )
    ),
    ["a"]
  );
  assert.deepStrictEqual(
    Array.from(
      findWinners(
        new Map([
          ["a", 1],
          ["b", 2],
          ["c", 0],
        ])
      )
    ),
    ["b"]
  );
  assert.deepStrictEqual(
    Array.from(
      findWinners(
        new Map([
          ["a", 1],
          ["b", 0],
          ["c", 2],
        ])
      )
    ),
    ["c"]
  );
});

it("should find 3 winners", () => {
  assert.deepStrictEqual(
    Array.from(
      findWinners(
        new Map([
          ["a", 1],
          ["c", 1],
          ["b", 1],
        ])
      )
    ).sort(),
    ["a", "b", "c"]
  );
});
