import type { Ballot, VoteCandidate } from "../vote";
import type { VotingMethodFunction } from "./votingMethodlmplementation";

const condorcet: VotingMethodFunction = (
  candidates: VoteCandidate[],
  votes: Ballot[]
) => {
  let candidateScores = new Map(candidates.map((candidate) => [candidate, 0]));

  candidates.forEach((candidate, index) => {
    for (let i = index + 1; i < candidates.length; i++) {
      let opponent: VoteCandidate = candidates[i];
      let firstWins = 0;
      let secondWins = 0;
      votes.forEach((ballot: Ballot) => {
        let firstScore = ballot.preferences.get(candidate) ?? 0;
        let secondScore = ballot.preferences.get(opponent) ?? 0;
        if (firstScore > secondScore) firstWins++;
        else if (firstScore < secondScore) secondWins++;
      });
      if (firstWins != secondWins) {
        let duelWinner: VoteCandidate =
          firstWins > secondWins ? candidate : opponent;

        candidateScores.set(duelWinner, candidateScores.get(duelWinner) + 1);
      }
    }
  });

  return candidateScores;
};
export default condorcet;
