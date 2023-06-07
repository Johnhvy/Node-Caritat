import {
  BallotFileFormat,
  checkBallot,
  loadYmlFile,
  loadYmlString,
  parseYml,
  VoteFileFormat,
} from "./parser.js";
import type { PathOrFileDescriptor } from "fs";
import type { CandidateScores } from "./votingMethods/VotingMethodImplementation.js";
import VoteResult from "./votingMethods/VoteResult.js";
import CondorcetResult from "./votingMethods/CondorcetResult.js";
import SingleRoundResult from "./votingMethods/SingleRoundResult.js";
import { ElectionSummaryOptions } from "./summary/electionSummary.js";

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

export function getVoteResultImplementation(
  method: VoteMethod
): typeof VoteResult {
  switch (method) {
    case "Condorcet":
      return CondorcetResult;
    case "SingleRound":
      return SingleRoundResult;
    default:
      break;
  }
  return null;
}
export interface VoteCommit {
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

  reasonToDiscardCommit(commit: VoteCommit): string {
    if (commit.files.length !== 1)
      return "This commit touches more than one file.";
    if (this.#alreadyCommittedVoters.has(commit.author))
      return "A more recent vote commit from this author has already been counted.";
    if (!this.#authorizedVoters.some((voter) => voter.id === commit.author))
      return `The commit author (${commit.author}) is not in the list of allowed voters.`;

    if (
      this.voteFileData.requireSignedBallots &&
      commit.signatureStatus !== "G"
    ) {
      return `Valid signature are required for this vote, expected status G, got ${commit.signatureStatus}`;
    }

    this.#alreadyCommittedVoters.add(commit.author);
    return null;
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

  public addBallotFile(ballotData: BallotFileFormat, author?: string): Ballot {
    if (checkBallot(ballotData, this.voteFileData, author)) {
      let preferences: Map<VoteCandidate, Rank> = new Map(
        ballotData.preferences.map((element) => [element.title, element.score])
      );
      let ballot: Ballot = {
        voter: { id: author ?? ballotData.author },
        preferences,
      };
      this.addBallot(ballot);
      return ballot;
    } else {
      console.warn("Invalid Ballot");
    }
    return null;
  }

  public addFakeBallot(author: string): void {
    this.addBallot({ voter: { id: author }, preferences: new Map() });
  }

  public addBallotFromBufferSource(data: BufferSource, author?: string): void {
    this.addBallotFile(
      parseYml<BallotFileFormat>(this.textDecoder.decode(data)),
      author
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

  public count(
    options?: Partial<ElectionSummaryOptions> & { method?: VoteMethod }
  ): VoteResult {
    if (this.#targetMethod == null) throw new Error("Set targetMethod before");
    const VoteResultImpl = getVoteResultImplementation(
      options?.method ?? this.#targetMethod
    );
    // @ts-ignore
    return new VoteResultImpl(
      this.#authorizedVoters,
      this.#candidates,
      this.subject,
      this.#votes,
      options
    );
  }
}
