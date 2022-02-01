import type { Ballot, VoteCandidate } from "../vote";
import type { VotingMethodFunction } from "./votingMethodImplementation";

const singleRound: VotingMethodFunction = (
  candidates: VoteCandidate[],
  votes: Ballot[]
) =>
  new Map(
    candidates.map((candidate) => [
      candidate,
      votes.filter(
        (ballot) =>
          Math.max(...ballot.preferences.values()) ===
          ballot.preferences.get(candidate)
      ).length,
    ])
  );
export default singleRound;
