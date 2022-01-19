/// <reference types="jest" />

//@ts-ignore
import * as caritat from "caritat";
import type {
  Actor,
  Ballot,
  VoteCandidate,
  VoteResult,
  VoteMethod,
} from "../src/app";
import * as fs from "fs";
import { loadYmlFile, templateBallot, voteFileFormat } from "../dist/parser";

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
            ) ?? { id: currentVoterName, publicKey: "-1" };
            votes.push({ integrity: "", voter: new Map(properPref) });
          }
        );

        let expectedResult = { winner: winner };
        let actualResult = caritat.vote(
          voteOptions,
          authorizedActors,
          votes,
          method
        );
        it("should find the obvious winner", () => {
          expect(actualResult).toStrictEqual(expectedResult);
        });
      }
    );
  }
);

let ballot = fs.readFileSync("./tests/fixtures/ballot.yml").toString();
it("should make correct template", () =>
  expect(
    templateBallot(loadYmlFile<voteFileFormat>("./tests/fixtures/vote.yml"))
      .split(/\s/)
      .join("")
  ).toBe(ballot.split(/\s/).join("")));
