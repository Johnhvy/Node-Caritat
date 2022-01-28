import {
  BallotFileFormat,
  checkBallot,
  loadYmlFile,
  parseYml,
  templateBallot,
  VoteFileFormat,
} from "./parser.js";
import type { PathOrFileDescriptor } from "fs";
import condorcet from "./votingMethods/condorcet.js";

export interface Actor {
  id: string;
}

export type VoteCandidate = string;

export type VoteMethod =
  | "MajorityJudgment"
  | "Condorcet"
  | "InstantRunoff"
  | "Scored"
  | string;

export type Rank = number;
export interface Ballot {
  voter: Actor;
  preferences: Map<VoteCandidate, Rank>;
}

export interface VoteResult {
  winner: VoteCandidate;
  winners?: VoteCandidate[];
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
  const scoresAsMap: Map<VoteCandidate, number> = condorcet(options, votes);
  const scores = [...scoresAsMap];
  const maxScore = scores.reduce((accumulator, currentValue) =>
    currentValue[1] > accumulator[1] ? currentValue : accumulator
  );
  return {
    winner: maxScore,
    winners: scores.filter((value) => value[1] == maxScore[1]),
  };
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
): any {
  switch (method) {
    case "MajorityJudgment":
      return voteMajorityJudgment(options, authorizedVoters, votes);
    case "Condorcet":
      return voteCondorcet(options, authorizedVoters, votes);
    case "InstantRunoff":
      return voteInstantRunoff(options, authorizedVoters, votes);
    case "Scored":
      return voteScored(options, authorizedVoters, votes);
    case "SingleRound":
      return;
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

  private textDecoder = new TextDecoder();

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
    this.#authorizedVoters = voteData.allowedVoters as any[] as Actor[];
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
      let preferences: Map<VoteCandidate, Rank> = new Map(
        ballotData.preferences.map((element) => [element.title, element.score])
      );
      let ballot: Ballot = {
        voter: { id: ballotData.author },
        preferences,
      };
      this.addBallot(ballot);
      return ballot;
    } else {
      console.log("invalid Ballot");
    }
    return null;
  }

  public addBallotFromBufferSource(data: BufferSource): void {
    this.addBallotFile(
      parseYml<BallotFileFormat>(this.textDecoder.decode(data))
    );
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

  public count(method?: VoteMethod): VoteResult {
    if (this.#targetMethod == null) throw new Error("Set targetMethod before");
    return vote(
      this.#candidates,
      this.#authorizedVoters,
      this.#votes,
      method ?? this.#targetMethod
    );
  }
}
