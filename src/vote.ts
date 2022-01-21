import {
  BallotFileFormat,
  checkBallot,
  loadYmlFile,
  templateBallot,
  VoteFileFormat,
} from "./parser.js";
import type { PathOrFileDescriptor } from "fs";

export interface Actor {
  id: string;
}

export type VoteCandidate = string;

export type VoteMethod =
  | "MajorityJudgment"
  | "Condorcet"
  | "InstantRunoff"
  | "Scored";

export type Rank = number;
export interface Ballot {
  voter: Actor;
  preferences: { [name: VoteCandidate]: Rank };
  integrity: string;
}

export interface VoteResult {
  winner: VoteCandidate;
}

function voteMajorityJudgment(
  options: VoteCandidate[],
  authorizedVoters: Actor[],
  votes: Ballot[]
) {
  return null;
}

function voteCondorcet(
  options: VoteCandidate[],
  authorizedVoters: Actor[],
  votes: Ballot[]
) {
  let scores: Map<VoteCandidate, number> = new Map(
    options.map((option: VoteCandidate) => [option, 0])
  );
  options.forEach((firstOption: VoteCandidate, index: number) => {
    for (let jndex = index + 1; jndex < options.length; jndex++) {
      let secondOption: VoteCandidate = options[jndex];
      let firstWins = 0;
      let secondWins = 0;
      votes.forEach((ballot: Ballot) => {
        if (authorizedVoters.includes(ballot.voter)) {
          let firstScore = ballot.preferences[firstOption];
          let secondScore = ballot.preferences[secondOption];
          if (firstScore > secondScore) firstWins++;
          else secondWins++;
        }
      });
      let duelWinner: VoteCandidate =
        firstWins > secondWins ? firstOption : secondOption;

      scores.set(duelWinner, scores.get(duelWinner) + 1);
    }
  });
  let maxScore = 0;
  let winner_s: VoteCandidate[] = [];
  scores.forEach((value: number, key: VoteCandidate) => {
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
  options: VoteCandidate[],
  authorizedVoters: Actor[],
  votes: Ballot[]
) {
  return null;
}

function voteScored(
  options: VoteCandidate[],
  authorizedVoters: Actor[],
  votes: Ballot[]
) {
  return null;
}

export function vote(
  options: VoteCandidate[],
  authorizedVoters: Actor[],
  votes: Ballot[],
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

export default class Vote {
  #candidates: VoteCandidate[];
  #authorizedVoters: Actor[];
  #votes: Ballot[];
  /**
   * Once the voting method is set, trying to change it would probably be vote manipulation, so it can only be set if already null
   * Trying to see the result with some voting method while the target is undefined would force it to be said method, for the same reasons
   */
  #targetMethod: VoteMethod = null;

  #checksum: string;

  public voteFileData: VoteFileFormat = null;

  constructor(options?: {
    candidates?: VoteCandidate[];
    authorizedVoters?: Actor[];
    votes?: Ballot[];
    targetMethod?: VoteMethod;
  }) {
    this.#candidates = options?.candidates ?? [];
    this.#authorizedVoters = options?.authorizedVoters ?? [];
    this.#votes = options?.votes ?? [];
    this.#targetMethod = options?.targetMethod;
  }

  public loadFromFile(voteFilePath: PathOrFileDescriptor): void {
    let voteData: VoteFileFormat = loadYmlFile<VoteFileFormat>(voteFilePath);
    this.voteFileData = voteData;
    this.#checksum = voteData.checksum;
    this.#candidates = voteData.candidates;
    this.#targetMethod = voteData.method as VoteMethod;
    // this.#authorizedVoters = voteData.voters;
  }

  public set targetMethod(method: VoteMethod) {
    if (this.#targetMethod == null) {
      this.#targetMethod = method;
      return;
    }
    throw new Error("Cannot change the existing target voting method");
  }

  public addCandidate(
    candidate: VoteCandidate,
    checkUniqueness: boolean = false
  ): void {
    if (
      checkUniqueness &&
      this.#candidates.some(
        (existingCandidate: VoteCandidate) => existingCandidate === candidate
      )
    ) {
      throw new Error("Cannot have duplicate candidate id");
    }

    this.#candidates.push(candidate);
  }

  public addAuthorizedVoter(
    actor: Actor,
    checkUniqueness: boolean = false
  ): void {
    if (
      checkUniqueness &&
      this.#authorizedVoters.some((voter: Actor) => voter.id === actor.id)
    ) {
      throw new Error("Cannot have duplicate voter id");
    }
    this.#authorizedVoters.push(actor);
  }

  public addBallotFile(ballotData: BallotFileFormat): Ballot {
    if (checkBallot(ballotData, this.voteFileData)) {
      let preferences: { [name: VoteCandidate]: Rank } = {};
      ballotData.preferences.forEach((element) => {
        preferences[element.title] = element.score;
      });
      let ballot: Ballot = {
        voter: { id: ballotData.author },
        preferences: preferences,
        integrity: "todo",
      };
      this.addBallot(ballot);
      return ballot;
    } else {
      console.log("invalid Ballot");
    }
    return null;
  }

  public addBallot(ballot: Ballot): void {
    let existingBallotIndex = this.#votes.findIndex(
      (existingBallot: Ballot) => existingBallot.voter.id === ballot.voter.id
    );
    if (existingBallotIndex !== -1) {
      this.#votes[existingBallotIndex] = ballot;
      return;
    }
    this.#votes.push(ballot);
  }

  public getResult(method?: VoteMethod): VoteResult {
    if (this.#targetMethod == null) throw new Error("Set targetMethod before");
    return vote(
      this.#candidates,
      this.#authorizedVoters,
      this.#votes,
      method ?? this.#targetMethod
    );
  }
}
