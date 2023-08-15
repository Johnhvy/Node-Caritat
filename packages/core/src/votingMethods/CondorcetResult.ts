import type { ElectionSummaryOptions } from "../summary/electionSummary";
import type { Actor, Ballot, VoteCandidate } from "../vote";
import VoteResult from "./VoteResult.js";
import type { CandidateScores } from "./VotingMethodImplementation";

export default class CondorcetResult extends VoteResult {
  #result: CandidateScores;

  constructor(
    authorizedVoters: Actor[] | undefined,
    candidates: VoteCandidate[],
    subject: string,
    votes: Ballot[],
    options: Partial<ElectionSummaryOptions>
  ) {
    super(authorizedVoters, candidates, subject, votes, options);

    this.#result = new Map(candidates.map((candidate) => [candidate, 0]));

    candidates.forEach((candidate, index) => {
      for (let i = index + 1; i < candidates.length; i++) {
        const opponent: VoteCandidate = candidates[i];
        let firstWins = 0;
        let secondWins = 0;
        votes.forEach((ballot: Ballot) => {
          const firstScore = ballot.preferences.get(candidate) ?? 0;
          const secondScore = ballot.preferences.get(opponent) ?? 0;
          if (firstScore > secondScore) firstWins++;
          else if (firstScore < secondScore) secondWins++;
        });
        if (firstWins != secondWins) {
          const duelWinner: VoteCandidate =
            firstWins > secondWins ? candidate : opponent;

          this.#result.set(duelWinner, this.#result.get(duelWinner) + 1);
        }
      }
    });
  }
  get result() {
    return this.#result;
  }
}
