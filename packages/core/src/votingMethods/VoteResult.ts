import CondorcetElectionSummary from "../summary/condorcetSummary.js";
import type { ElectionSummaryOptions } from "../summary/electionSummary.js";
import type { Actor, Ballot, VoteCandidate } from "../vote.js";

export type CandidateScores = Map<VoteCandidate, number>;

export default abstract class VoteResult {
  #authorizedVoters: Actor[];
  #votes: Ballot[];
  #options: Partial<ElectionSummaryOptions>;
  #subject: string;

  abstract readonly result: CandidateScores;

  constructor(
    authorizedVoters: Actor[],
    candidates: VoteCandidate[],
    subject: string,
    votes: Ballot[],
    options: Partial<ElectionSummaryOptions>
  ) {
    this.#authorizedVoters = authorizedVoters;
    this.#subject = subject;
    this.#votes = votes;
    this.#options = options;
  }

  *findWinners(): Generator<VoteCandidate, void, unknown> {
    const maxScore = Math.max(...this.result.values());
    for (const [candidate, score] of this.result) {
      if (score === maxScore) yield candidate;
    }
  }

  get participation(): number {
    const expectedVotes = this.#authorizedVoters?.length;
    if (!expectedVotes) return 1;
    return this.#votes.length / expectedVotes;
  }

  public generateSummary(
    privateKey: string,
    options?: Partial<ElectionSummaryOptions>
  ) {
    if (this.result == null) {
      throw new Error("Can't summarize vote that hasn't been counted yet.");
    }

    const winners = Array.from(this.findWinners());

    return new CondorcetElectionSummary({
      subject: this.#subject,
      endDate: new Date().toISOString(),
      participation: this.participation,
      winners,
      result: this.result,
      ballots: this.#votes,
      privateKey,
      ...this.#options,
      ...options,
    }).toString();
  }

  public toJSON() {
    const votes = Object.fromEntries(
      this.#votes.map((ballot) => [
        ballot.voter.id,
        Object.fromEntries(ballot.preferences),
      ])
    );
    return {
      description: this.#subject,
      outcome: { "winner(s)": [...this.findWinners()] },
      votes,
    };
  }
}
