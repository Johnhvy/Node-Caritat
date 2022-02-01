import * as yaml from "js-yaml";
import * as fs from "fs";
import * as crypto from "crypto";

export interface VoteFileFormat {
  candidates: string[];
  allowedVoters: string[];
  method: string;
  publicKey: string;
  encryptedPrivateKey: string;
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

export function loadYmlFile<T>(filePath: fs.PathOrFileDescriptor): T {
  try {
    const documentBuffer: Buffer = fs.readFileSync(filePath);
    const document: string = documentBuffer.toString();
    const data: T = yaml.load(document) as T;
    if (instanceOfVoteFile(data)) {
      const hash = crypto.createHash("sha512");
      hash.update(documentBuffer);
      data.checksum = hash.digest().toString("base64");
    }
    return data;
  } catch (e) {
    console.log(e);
  }
}

export function templateBallot(
  vote_data: VoteFileFormat,
  user: UserCredentials = {
    username: null,
    emailAddress: null,
  }
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
  const candidates: string[] = vote_data.candidates;

  const template: BallotFileFormat = {
    preferences: [],
    author: `${user.username} <${user.emailAddress}>`,
    poolChecksum: vote_data.checksum,
  };
  template.preferences.push(
    ...candidates.map((title) => ({ title, score: 0 }))
  );
  return subject + header + yaml.dump(template) + footer;
}

export function checkBallot(
  ballotFile: BallotFileFormat,
  voteFile: VoteFileFormat
): boolean {
  return (
    ballotFile.poolChecksum === voteFile.checksum &&
    ballotFile.author != null &&
    ballotFile.preferences.every(
      (preference) =>
        voteFile.candidates.some(
          (candidate) => candidate === preference.title
        ) && Number.isSafeInteger(preference.score)
    )
  );
}
