import * as fs from "fs";

import BallotPoolGit from "../dist/ballotpool.js";

import type { CommitNode } from "../src/ballotpool.js";

const fixturesURL = new URL("./fixtures/", import.meta.url);

const commitTree: CommitNode[] = [
  { sha: "0", author: "riri", isValid: true },
  { sha: "1", author: "fifi", isValid: true },
  { sha: "2", author: "loulou", isValid: true },
  { sha: "3", author: "loulou", isValid: true },
  { sha: "4", author: "fifi", isValid: false },
];

it("should add ballot without problem", () => {
  const pool = new BallotPoolGit(commitTree);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "0" })).toBe(true);
});

it("should fail to add ballot with invalid sha", () => {
  const pool = new BallotPoolGit(commitTree);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "-1" })).toBe(false);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "" })).toBe(false);
});

it("should manage to add newer ballot with same author", () => {
  const pool = new BallotPoolGit(commitTree);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "3" })).toBe(true);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "2" })).toBe(true);
});

it("should fail to add older ballot with same author", () => {
  const pool = new BallotPoolGit(commitTree);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "2" })).toBe(true);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "3" })).toBe(false);
});

it("should refuse invalid commits", () => {
  const pool = new BallotPoolGit(commitTree);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "4" })).toBe(false);
});

it("should accept only the authorizedVoters", () => {
  const pool = new BallotPoolGit(commitTree, ["riri", "fifi"]);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "0" })).toBe(true);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "1" })).toBe(true);
  expect(pool.addBallot({ url: fixturesURL, commitSha: "2" })).toBe(false);
});
