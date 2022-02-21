import type ElectionSummary from "../summary/electionSummary";
import type { Actor, Ballot, VoteCandidate } from "../vote";
import VoteResult from "./voteResult.js";
import type { CandidateScores } from "./votingMethodImplementation";

export default class SingleRoundResult extends VoteResult {
  #result: CandidateScores;

  constructor(
    authorizedVoters: Actor[],
    candidates: VoteCandidate[],
    subject: string,
    votes: Ballot[],
    options: Partial<ElectionSummary>
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
