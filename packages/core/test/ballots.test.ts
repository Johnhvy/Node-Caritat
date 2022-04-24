import it from "node:test";
import { strict as assert } from "node:assert";

import BallotPoolGit from "../dist/ballotpool.js";

import type { CommitNode } from "../src/ballotpool.js";

const fixturesURL = new URL("../../../test/fixtures/", import.meta.url);

const commitTree: CommitNode[] = [
  { sha: "0", author: "riri", isValid: true },
  { sha: "1", author: "fifi", isValid: true },
  { sha: "2", author: "loulou", isValid: true },
  { sha: "3", author: "loulou", isValid: true },
  { sha: "4", author: "fifi", isValid: false },
];

it("should add ballot without problem", () => {
  const pool = new BallotPoolGit(commitTree);
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "0" }),
    true
  );
});

it("should fail to add ballot with invalid sha", () => {
  const pool = new BallotPoolGit(commitTree);
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "-1" }),
    false
  );
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "" }),
    false
  );
});

it("should manage to add newer ballot with same author", () => {
  const pool = new BallotPoolGit(commitTree);
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "3" }),
    true
  );
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "2" }),
    true
  );
});

it("should fail to add older ballot with same author", () => {
  const pool = new BallotPoolGit(commitTree);
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "2" }),
    true
  );
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "3" }),
    false
  );
});

it("should refuse invalid commits", () => {
  const pool = new BallotPoolGit(commitTree);
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "4" }),
    false
  );
});

it("should accept only the authorized voters", () => {
  const pool = new BallotPoolGit(commitTree, ["riri", "fifi"]);
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "0" }),
    true
  );
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "1" }),
    true
  );
  assert.strictEqual(
    pool.addBallot({ url: fixturesURL, commitSha: "2" }),
    false
  );
});
