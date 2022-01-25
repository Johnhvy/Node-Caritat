import { URL } from "url";
import { BallotPool } from "../dist/ballotpool";
import { loadYmlFile } from "../dist/parser.js";
import type { VoteFileFormat } from "../src/parser";

const fixturesURL = new URL("./fixtures/", import.meta.url);

const ballotDirURL = new URL("./ballots/", fixturesURL);

let voteFileParsed = loadYmlFile<VoteFileFormat>(
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
  constructor(voteFile, ballots: BallotPool) {}
  public count(): VoteResult {
    return { winner: "foo" } as VoteResult;
  }
}

it("should find the winner", () => {
  const pool: BallotPool = new BallotPool();
  const vote = new Vote(voteFileParsed, pool);
  const result = vote.count();
  expect(result.winner).not.toBeNull();
});
