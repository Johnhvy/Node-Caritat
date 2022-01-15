export class Actor {
  id: string;
  publicKey: number;
}

export class VoteOption {
  id: number;
  name?: string;
}

export type VoteMethod =
  | "MajorityJudgment"
  | "Condorcet"
  | "InstantRunoff"
  | "Scored";

type Rank = number;
export interface Vote {
  voter: Actor;
  preferences: Map<VoteOption, Rank>;
  integrity: string;
}

export interface MajorityVotes {
  N: number;
  O: number;
  votes: Array<Array<{ candidatID: number; tier: number }>>;
}

export interface VoteResult {
  winner: VoteOption;
}

//potential name : mibarila (from majority judgement inventors name)

function voteMajorityJudgment(
  options: VoteOption[],
  authorizedVoters: Actor[],
  votes: Vote[]
) {
  return null;
}

function voteCondorcet(
  options: VoteOption[],
  authorizedVoters: Actor[],
  votes: Vote[]
) {
  let scores: Map<VoteOption, number> = new Map(
    options.map((option: VoteOption) => [option, 0])
  );
  options.forEach((firstOption: VoteOption, index: number) => {
    for (let jndex = index + 1; jndex < options.length; jndex++) {
      let secondOption: VoteOption = options[jndex];
      let firstWins = 0;
      let secondWins = 0;
      votes.forEach((ballot: Vote) => {
        if (authorizedVoters.includes(ballot.voter)) {
          let firstScore = ballot.preferences.get(firstOption);
          let secondScore = ballot.preferences.get(secondOption);
          if (firstScore > secondScore) firstWins++;
          else secondWins++;
        }
      });
      let duelWinner: VoteOption =
        firstWins > secondWins ? firstOption : secondOption;

      scores.set(duelWinner, scores.get(duelWinner) + 1);
    }
  });
  let maxScore = 0;
  let winner_s: VoteOption[] = [];
  scores.forEach((value: number, key: VoteOption) => {
    if (value == maxScore) {
      winner_s.push(key);
    }
    if (value > maxScore) {
      maxScore = value;
      winner_s = [key];
    }
  });
  return { winner: winner_s[Math.floor(Math.random() * winner_s.length)] };
}

function voteInstantRunoff(
  options: VoteOption[],
  authorizedVoters: Actor[],
  votes: Vote[]
) {
  return null;
}

function voteScored(
  options: VoteOption[],
  authorizedVoters: Actor[],
  votes: Vote[]
) {
  return null;
}

export default function vote(
  options: VoteOption[],
  authorizedVoters: Actor[],
  votes: Vote[],
  method: VoteMethod
): VoteResult {
  switch (method) {
    case "MajorityJudgment":
      return voteMajorityJudgment(options, authorizedVoters, votes);
    case "Condorcet":
      return voteCondorcet(options, authorizedVoters, votes);
    case "InstantRunoff":
      return voteInstantRunoff(options, authorizedVoters, votes);
    case "Scored":
      return voteScored(options, authorizedVoters, votes);
    default:
      break;
  }
  return null;
}

export type voteFType = typeof vote;
