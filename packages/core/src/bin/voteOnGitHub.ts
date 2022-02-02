#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import voteUsingGit, { cliArgs, getEnv } from "../voteUsingGit.js";

const parsedArgs = parseArgs()
  .options({
    ...(cliArgs as any),

    // Disable CLI flags that are provided in the PR-url.
    repo: undefined,
    branch: undefined,
    handle: undefined,

    protocol: {
      describe:
        "the protocol to use to pull the remote repository, either SSH or HTTP (defaults to SSH if a public SSH key is found for the current user)",
      type: "string",
    },
    login: {
      describe:
        "GitHub handle (if not provided, will be fetched using GitHub CLI)",
      type: "string",
    },
    username: {
      describe:
        "User public name (if not provided, will be fetched using GitHub CLI)",
      type: "string",
    },
    "gh-binary": {
      describe: "Path to the GitHub CLI executable",
      default: "gh",
      normalize: true,
      type: "string",
    },
  })
  .command(
    "$0 <pr-url>",
    "extract vote info from GitHub pull request",
    (yargs) => {
      yargs.positional("pr-url", {
        demandOption: true,
        type: "string",
        describe: "URL to the GitHub pull request",
      });
    }
  ).argv;

const prUrlInfo = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/.exec(
  parsedArgs.prUrl as any
);

if (prUrlInfo == null) {
  throw new Error("Invalid PR URL");
}

const [, owner, repo, prNumber] = prUrlInfo;

const query = `query PR($prid: Int!, $owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $prid) {
        commits(first: 1) {
          nodes {
            commit {
              oid
            }
          }
        }
        headRefName
        closed
        merged
      }
      ${parsedArgs.protocol === "http" ? "" : "sshUrl"}
      ${parsedArgs.protocol === "ssh" ? "" : "url"}
    }
    viewer {
      ${parsedArgs.login ? "" : "login"}
      ${parsedArgs.username ? "" : "name"}
      ${parsedArgs.protocol ? "" : "publicKeys(first: 1) {totalCount}"}
    }
  }
`;

const { data } = JSON.parse(
  await runChildProcessAsync(
    parsedArgs["gh-binary"] as string,
    [
      "api",
      "graphql",
      "-F",
      `owner=${owner}`,
      "-F",
      `repo=${repo}`,
      "-F",
      `prid=${prNumber}`,
      "-f",
      `query=${query}`,
    ],
    { captureStdout: true }
  )
);

const { pullRequest } = data.repository;

const sha = pullRequest.commits.nodes[0].commit.oid;

const { headRefName: branch, merged, closed } = pullRequest;

if (merged || closed) {
  console.warn("The pull request seems to be closed.");
}

const files = await runChildProcessAsync(
  parsedArgs["gh-binary"] as string,
  [
    "api",
    `/repos/${owner}/${repo}/commits/${sha}`,
    "--jq",
    ".files.[] | .filename",
  ],
  { captureStdout: true }
);

const voteFileCanonicalName = "vote.yml";
const subPath = files
  .split("\n")
  .find(
    (path) =>
      path === voteFileCanonicalName ||
      path.endsWith(`/${voteFileCanonicalName}`)
  )
  ?.slice(0, -voteFileCanonicalName.length);

const protocol =
  parsedArgs.protocol ?? (data.viewer.publicKeys.totalCount ? "ssh" : "http");

console.log({
  repo,
  branch,
  subPath,
  protocol,
});

await voteUsingGit({
  username: data.viewer.name,
  ...(await getEnv(parseArgs)),
  repoUrl: protocol === "ssh" ? data.repository.sshUrl : data.repository.url,
  branch,
  subPath,
  handle: parsedArgs.login || data.viewer.login,
});
