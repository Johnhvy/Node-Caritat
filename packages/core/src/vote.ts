import {
  BallotFileFormat,
  checkBallot,
  loadYmlFile,
  loadYmlString,
  parseYml,
  VoteFileFormat,
} from "./parser.js";
import type { PathOrFileDescriptor } from "fs";
import condorcet from "./votingMethods/condorcet.js";
import singleRound from "./votingMethods/singleRound.js";
import { CandidateScores } from "./votingMethods/votingMethodImplementation.js";
import getParticipation from "./utils/participation.js";
import findWinners from "./utils/findWinner.js";
import CondorcetElectionSummary from "./summary/condorcetSummary.js";

export interface Actor {
  id: string;
}

export type VoteCandidate = string;

export type VoteMethod =
  | "MajorityJudgment"
  | "Condorcet"
  | "InstantRunoff"
  | "Scored"
  | "SingleRound";

export type Rank = number;
export interface Ballot {
  voter: Actor;
  preferences: Map<VoteCandidate, Rank>;
}

export interface VoteResult {
  winner: VoteCandidate;
  winners?: VoteCandidate[];
}

export function vote(
  options: VoteCandidate[],
  votes: Ballot[],
  method: VoteMethod
): CandidateScores {
  switch (method) {
    case "Condorcet":
      return condorcet(options, votes);
    case "SingleRound":
      return singleRound(options, votes);
    default:
      break;
  }
  return null;
}
interface Commit {
  sha: string;
  author: string;
  signatureStatus: string;
  files: string[];
}

export default class Vote {
  #candidates: VoteCandidate[];
  #authorizedVoters: Actor[];
  #votes: Ballot[];
  public subject: string;
  private result: CandidateScores;
  /**
   * Once the voting method is set, trying to change it would probably be vote manipulation, so it can only be set if already null
   * Trying to see the result with some voting method while the target is undefined would force it to be said method, for the same reasons
   */
  #targetMethod: VoteMethod = null;

  #alreadyCommittedVoters = new Set();

  private textDecoder = new TextDecoder();

  public voteFileData: VoteFileFormat = null;

  constructor(options?: {
    candidates?: VoteCandidate[];
    authorizedVoters?: Actor[];
    votes?: Ballot[];
    targetMethod?: VoteMethod;
    subject?: string;
  }) {
    this.#candidates = options?.candidates ?? [];
    this.#authorizedVoters = options?.authorizedVoters ?? [];
    this.#votes = options?.votes ?? [];
    this.#targetMethod = options?.targetMethod;
    this.subject = options?.subject ?? "";
  }

  public loadFromFile(voteFilePath: PathOrFileDescriptor): void {
    let voteData: VoteFileFormat = loadYmlFile<VoteFileFormat>(voteFilePath);
    this.voteFromVoteData(voteData);
  }
  public loadFromString(voteFileContents: string): void {
    let voteData: VoteFileFormat =
      loadYmlString<VoteFileFormat>(voteFileContents);
    this.voteFromVoteData(voteData);
  }
  private voteFromVoteData(voteData: VoteFileFormat) {
    this.voteFileData = voteData;
    this.#candidates = voteData.candidates;
    this.#targetMethod = voteData.method as VoteMethod;
    this.#authorizedVoters = voteData.allowedVoters.map((id) => ({ id }));
    this.subject = voteData.subject ?? "Unknown vote";
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

  canAcceptCommit(commit?: Commit): boolean {
    if (commit == null) return false;

    if (commit.files.length !== 1) return false;
    if (this.#alreadyCommittedVoters.has(commit.author)) return false;
    if (!this.#authorizedVoters.some((voter) => voter.id === commit.author)) {
      console.warn(commit.author, "is not in the list of allowed voters.");
      return false;
    }

    // TODO: check commits signatures?

    this.#alreadyCommittedVoters.add(commit.author);
    return true;
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
      console.warn("Invalid Ballot");
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

  public count(method?: VoteMethod): CandidateScores {
    if (this.#targetMethod == null) throw new Error("Set targetMethod before");
    this.result = vote(
      this.#candidates,
      this.#votes,
      method ?? this.#targetMethod
    );
    return this.result;
  }

  public generateSummary(privateKey: string) {
    if (this.result != null) {
      const participation = getParticipation(
        this.#authorizedVoters,
        this.#votes.length
      );
      const winners = Array.from(findWinners(this.result));

      return new CondorcetElectionSummary({
        subject: this.subject,
        endDate: new Date().toISOString(),
        participation,
        winners,
        result: this.result,
        ballots: this.#votes,
        privateKey,
      }).toString();
    } else {
      throw new Error("Can't summarize vote that hasn't been counted yet.");
    }
  }
}
