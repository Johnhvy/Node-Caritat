import * as yaml from "js-yaml";
import * as fs from "fs";
import * as crypto from "crypto";

export interface VoteFileFormat {
  candidates: string[];
  voters: string[];
  method: string;
  publicKey: string;
  encryptedPrivateKey: string;
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

export function loadYmlFile<T>(filePath: fs.PathOrFileDescriptor): T {
  try {
    let documentBuffer: Buffer = fs.readFileSync(filePath);
    let document: string = documentBuffer.toString();
    let data: T = yaml.load(document) as T;
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
  let tooltip: string =
    "# Please set a score to each candidate according to your preferences\n# Don't forget to put your correct name and email\n";

  let candidates: string[] = vote_data.candidates;

  let template: BallotFileFormat = {
    preferences: [],
    author: `${user.username} <${user.emailAddress}>`,
    poolChecksum: vote_data.checksum,
  };
  candidates.forEach((candidate: string) => {
    template.preferences.push({ title: candidate, score: 0 });
  });
  return tooltip + yaml.dump(template);
}

function doubleCheckSum(
  ballotFile: BallotFileFormat,
  voteFile: VoteFileFormat
) {
  return ballotFile.poolChecksum === voteFile.checksum;
}

export function checkBallot(
  ballotFile: BallotFileFormat,
  voteFile: VoteFileFormat
): boolean {
  return (
    doubleCheckSum(ballotFile, voteFile) &&
    ballotFile.author != null &&
    ballotFile.preferences.every((preference) =>
      voteFile.candidates.some((candidate) => candidate === preference.title)
    )
  );
}
