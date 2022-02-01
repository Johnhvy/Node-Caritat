import type { VoteCandidate } from "../vote";
import type { CandidateScores } from "../votingMethods/votingMethodImplementation";

export default function* findWinners(
  scores: CandidateScores
): Generator<VoteCandidate, void, unknown> {
  let maxScore = Math.max(...scores.values());
  for (const [candidate, score] of scores) {
    if (score === maxScore) yield candidate;
  }
}
