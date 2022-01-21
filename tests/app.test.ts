/// <reference types="jest" />

//@ts-ignore
import * as caritat from "caritat";
import type {
  Actor,
  Ballot,
  VoteCandidate,
  VoteResult,
  VoteMethod,
} from "../src/vote";
import * as fs from "fs";
import { checkBallot, loadYmlFile, templateBallot } from "../dist/parser";
import type { BallotFileFormat, VoteFileFormat } from "../src/parser";
import { vote } from "../dist/vote";

let testData = JSON.parse(
  fs.readFileSync("./tests/tests_votes.json").toString()
);

testData.forEach(
  (testSuite: {
    candidates: VoteCandidate[];
    voters: Actor[];
    examples: {
      method: string;
      winner: string;
      ballots: { voter: string; preferences: any }[];
    }[];
  }) => {
    let voteOptions: VoteCandidate[] = testSuite.candidates;
    let authorizedActors: Actor[] = testSuite.voters;

    testSuite.examples.forEach(
      (example: {
        method: string;
        winner: string;
        ballots: { voter: string; preferences: any }[];
      }) => {
        let votes = [];

        let method: VoteMethod = example.method as VoteMethod;
        let winner: string = example.winner;
        let jsonBallots: { voter: string; preferences: any }[] =
          example.ballots;
        jsonBallots.forEach(
          (jsonBallot: { voter: string; preferences: any }) => {
            let currentVoterName: string = jsonBallot.voter;
            let preference = jsonBallot.preferences;
            let properPref = [];
            voteOptions.forEach((candidate) => {
              properPref.push([candidate, preference[candidate]]);
            });
            let voter: Actor = authorizedActors.find(
              (actor) => actor[0] === currentVoterName
            ) ?? { id: currentVoterName };
            votes.push({ integrity: "", voter: new Map(properPref) });
          }
        );

        let expectedResult = { winner: winner };
        let actualResult = vote(voteOptions, authorizedActors, votes, method);
        it("should find the obvious winner", () => {
          expect(actualResult).toStrictEqual(expectedResult);
        });
      }
    );
  }
);

let ballotString = fs.readFileSync("./tests/fixtures/ballot.yml").toString();
it("should make correct template", () =>
  expect(
    templateBallot(loadYmlFile<VoteFileFormat>("./tests/fixtures/vote.yml"))
      .split(/\s/)
      .join("")
  ).toBe(ballotString.split(/\s/).join("")));

let vote_ = loadYmlFile<VoteFileFormat>("./tests/fixtures/vote.yml");
let ballot = loadYmlFile<BallotFileFormat>("./tests/fixtures/ballot.yml");
let badBallot = loadYmlFile<BallotFileFormat>("./tests/fixtures/badBallot.yml");
let badBallot1 = loadYmlFile<BallotFileFormat>(
  "./tests/fixtures/badBallot1.yml"
);
let badBallot2 = loadYmlFile<BallotFileFormat>(
  "./tests/fixtures/badBallot2.yml"
);

it("should say the ballot is correct", () =>
  expect(checkBallot(ballot, vote_)).toBe(true));

it("should say the ballot is incorrect", () =>
  expect(checkBallot(badBallot, vote_)).toBe(false));

it("should say the ballot is incorrect", () =>
  expect(checkBallot(badBallot1, vote_)).toBe(false));

it("should say the ballot is incorrect", () =>
  expect(checkBallot(badBallot2, vote_)).toBe(false));
