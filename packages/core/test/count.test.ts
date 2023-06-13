import it from "node:test";
import { strict as assert } from "node:assert";

import { BallotPool } from "../src/ballotpool.js";
import { loadYmlFile } from "../src/parser.js";
import type { VoteFileFormat } from "../src/parser";

const fixturesURL = new URL("../../../test/fixtures/", import.meta.url);

// const ballotDirURL = new URL("./ballots/", fixturesURL);

const voteFileParsed = loadYmlFile<VoteFileFormat>(
  new URL("vote.yml", fixturesURL)
);
// it("should create ballot pool", () => {
//   let pool: BallotPool = new BallotPool();
//   pool.addBallot({ url: "ballotDirURL" });
// });
interface PotentialWinner {
  name: string;
  weight: number;
}
interface VoteResult {
  winner: string;
  potentialWinners: PotentialWinner[];
}
class Vote {
  public count(): VoteResult {
    return { winner: "foo" } as VoteResult;
  }
}

it("should find the winner", () => {
  const pool: BallotPool = new BallotPool();
  const vote = new Vote(voteFileParsed, pool);
  const result = vote.count();
  assert.ok(result.winner != null);
});
