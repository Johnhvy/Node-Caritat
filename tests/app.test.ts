/// <reference types="jest" />

//@ts-ignore
import * as caritat from "caritat";
import type {
  Actor,
  Vote,
  VoteOption,
  VoteResult,
  voteFType,
  VoteMethod,
} from "../src/app";

let carDef: voteFType = caritat.default;

test("should find the obvious winner", () => {
  let voteOptions: VoteOption[];
  let authorizedActors: Actor[];
  let votes: Vote[] = null;

  let expectedResult: VoteResult = null;
  let actualResult: VoteResult = null;

  voteOptions = [
    { id: 0, name: "Alice" },
    { id: 1, name: "Bob" },
    { id: 0, name: "Charlie" },
  ];
  authorizedActors = [
    { id: "Riri", publicKey: 0 },
    { id: "Fifi", publicKey: 0 },
    { id: "Loulou", publicKey: 0 },
  ];

  let ririPref: Map<VoteOption, number> = new Map([
    [voteOptions[0], 0],
    [voteOptions[1], 1],
    [voteOptions[2], 2],
  ]);
  let fifiPref: Map<VoteOption, number> = new Map([
    [voteOptions[0], 1],
    [voteOptions[1], 0],
    [voteOptions[2], 2],
  ]);
  let loulouPref: Map<VoteOption, number> = new Map([
    [voteOptions[0], 0],
    [voteOptions[1], 1],
    [voteOptions[2], 2],
  ]);

  votes = [
    { integrity: "", voter: authorizedActors[0], preferences: ririPref },
    { integrity: "", voter: authorizedActors[1], preferences: fifiPref },
    { integrity: "", voter: authorizedActors[2], preferences: loulouPref },
  ];

  expectedResult = { winner: voteOptions[2] };

  actualResult = carDef(voteOptions, authorizedActors, votes, "Condorcet");
  expect(actualResult).toStrictEqual(expectedResult);

//   actualResult = carDef(
//     voteOptions,
//     authorizedActors,
//     votes,
//     "MajorityJudgment"
//   );
//   expect(actualResult).toStrictEqual(expectedResult);

//   actualResult = carDef(voteOptions, authorizedActors, votes, "InstantRunoff");
//   expect(actualResult).toStrictEqual(expectedResult);

//   actualResult = carDef(voteOptions, authorizedActors, votes, "Scored");
//   expect(actualResult).toStrictEqual(expectedResult);
});
