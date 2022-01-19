import * as yaml from "js-yaml";
import * as fs from "fs";
import * as crypto from "crypto";

export interface voteFileFormat {
  candidates: string[];
  voters: string[];
  method: string;
  publicKey: string;
  encryptedPrivateKey: string;
  checksum?: string;
}
function instanceOfVoteFile(object: any): object is voteFileFormat {
  return "candidates" in object;
}

export interface ballotFileFormat {
  preferences: { title: string; score: number }[];
  author: string;
  poolChecksum: string;
}

export function loadYmlFile<T>(file_path: fs.PathOrFileDescriptor): T {
  try {
    let documentBuffer: Buffer = fs.readFileSync(file_path);
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

export function templateBallot(vote_data: voteFileFormat): string {
  let candidates: string[] = vote_data.candidates;

  let template: ballotFileFormat = {
    preferences: [],
    author: "John Doe <john@doe.com>",
    poolChecksum: vote_data.checksum,
  };
  candidates.forEach((candidate: string) => {
    template.preferences.push({ title: candidate, score: 0 });
  });
  return yaml.dump(template);
}

export function checkBallot(
  ballotFile: ballotFileFormat,
  voteFile: voteFileFormat
): boolean {
  if (ballotFile.poolChecksum !== voteFile.checksum) return false;
  return !ballotFile.preferences.some(
    (preference) =>
      voteFile.candidates.find(
        (candidate) => candidate === preference.title
      ) === undefined
  );
}
