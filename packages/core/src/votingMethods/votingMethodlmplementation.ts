import type { Actor, Ballot, VoteCandidate, VoteResult } from "../vote";

export type CandidateScores = Map<VoteCandidate, number>;

export type VotingMethodFunction = (
  candidates: VoteCandidate[],
  votes: Ballot[]
) => CandidateScores;
