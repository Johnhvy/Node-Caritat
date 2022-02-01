import { checkBallot, loadYmlFile } from "./parser.js";
import type { BallotFileFormat, VoteFileFormat } from "./parser";

function main(argv: string[]): void {
  let ballotPath = argv[2];
  let votePath = argv[3];

  let voteFile = loadYmlFile<VoteFileFormat>(votePath);

  let ballotFile: BallotFileFormat = loadYmlFile<BallotFileFormat>(ballotPath);
  if (checkBallot(ballotFile, voteFile)) {
    console.log("valid");
    process.exit(0);
  } else {
    console.log("invalid");
    process.exit(-1);
  }
}

main(process.argv);
