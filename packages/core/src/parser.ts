import * as yaml from "js-yaml";
import * as fs from "fs";
import * as crypto from "crypto";
import { VoteMethod } from "./vote.js";

export interface VoteFileFormat {
  candidates: string[];
  allowedVoters: string[];
  method: VoteMethod;
  publicKey: string;
  encryptedPrivateKey: string;
  shares: string[];
  subject?: string;
  headerInstructions?: string;
  footerInstructions?: string;
  checksum?: string;
}
function instanceOfVoteFile(object: any): object is VoteFileFormat {
  return "candidates" in object;
}

export interface BallotFileFormat {
  preferences: { title: string; score: number }[];
  author: string;
  poolChecksum: string;
}

export interface UserCredentials {
  username: string;
  emailAddress: string;
}

export function parseYml<T>(document: string): T {
  try {
    return yaml.load(document) as T;
  } catch (e) {
    console.log(e);
  }
}

export function loadYmlString<T>(
  document: string,
  encoding?: crypto.Encoding,
  documentBuffer?: crypto.BinaryLike
): T {
  const data: T = yaml.load(document) as T;
  if (instanceOfVoteFile(data)) {
    const hash = crypto.createHash("sha512");
    if (documentBuffer) {
      hash.update(documentBuffer);
    } else {
      hash.update(document, encoding);
    }
    data.checksum = hash.digest().toString("base64");
  }
  return data;
}
export function loadYmlFile<T>(filePath: fs.PathOrFileDescriptor): T {
  const documentBuffer: Buffer = fs.readFileSync(filePath);
  const document: string = documentBuffer.toString();
  return loadYmlString<T>(document, null, documentBuffer);
}

/*** Fisher-Yates shuffle */
function shuffle<T>(array: Array<T>): Array<T> {
  let currentIndex = array.length,
    randomIndex: number;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export function templateBallot(
  vote_data: VoteFileFormat,
  user: UserCredentials = undefined,
  shuffleCandidates: boolean = true
): string {
  const subject: string = vote_data.subject
    ? yaml.dump({ subject: vote_data.subject }) + "\n"
    : "";

  const header = vote_data.headerInstructions
    ? "# " +
      vote_data.headerInstructions.trim().replaceAll("\n", "\n# ") +
      "\n\n"
    : "";
  const footer = vote_data.footerInstructions
    ? "\n# " + vote_data.footerInstructions.trim().replaceAll("\n", "\n# ")
    : "";
  const candidates: string[] = shuffleCandidates
    ? shuffle(vote_data.candidates)
    : vote_data.candidates;

  const template: BallotFileFormat = {
    preferences: [],
    ...(user && { author: `${user.username} <${user.emailAddress}>` }),
    poolChecksum: vote_data.checksum,
  };
  template.preferences.push(
    ...candidates.map((title) => ({ title, score: 0 }))
  );
  return subject + header + yaml.dump(template) + footer + "\n";
}

export function checkBallot(
  ballotFile: BallotFileFormat,
  voteFile: VoteFileFormat,
  author?: string
): boolean {
  return (
    ballotFile.poolChecksum === voteFile.checksum &&
    (author ?? ballotFile.author) != null &&
    ballotFile.preferences.every(
      (preference) =>
        voteFile.candidates.some(
          (candidate) => candidate === preference.title
        ) && Number.isSafeInteger(preference.score)
    )
  );
}
