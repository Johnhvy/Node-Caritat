import type { ElectionSummaryOptions } from "../summary/electionSummary";
import type { Actor, Ballot, VoteCandidate } from "../vote";
import VoteResult from "./VoteResult.js";
import type { CandidateScores } from "./VotingMethodImplementation";

export default class SingleRoundResult extends VoteResult {
  #result: CandidateScores;

  constructor(
    authorizedVoters: Actor[],
    candidates: VoteCandidate[],
    subject: string,
    votes: Ballot[],
    options: Partial<ElectionSummaryOptions>
  ) {
    super(authorizedVoters, candidates, subject, votes, options);

    this.#result = new Map(
      candidates.map((candidate) => [
        candidate,
        votes.filter(
          (ballot) =>
            Math.max(...ballot.preferences.values()) ===
            ballot.preferences.get(candidate)
        ).length,
      ])
    );
  }
  get result() {
    return this.#result;
  }
}
