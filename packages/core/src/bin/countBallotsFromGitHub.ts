#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import countFromGit, { cliArgs, getEnv } from "../countBallotsFromGit.js";
import readStdIn from "../utils/readStdin.js";
import fs from "fs/promises";

const parsedArgs = parseArgs()
  .options({
    ...(cliArgs as any),

    // Disable CLI flags that are provided in the PR-url.
    repo: { hidden: true },
    branch: { hidden: true },
    path: { hidden: true },
    handle: { hidden: true },

    protocol: {
      describe:
        "the protocol to use to pull the remote repository, either SSH or " +
        "HTTP (defaults to SSH if a public SSH key is found for the current " +
        "user, otherwise default to HTTP)",
      type: "string",
    },
    login: {
      describe:
        "GitHub handle (if not provided, will be fetched using GitHub CLI)",
      type: "string",
    },
    "post-comment": {
      describe:
        "Post the comment containing the election summary to the pull request",
      default: false,
      type: "boolean",
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
    "Extracts vote info from GitHub pull request, and counts the ballots.",
    (yargs) => {
      yargs.positional("pr-url", {
        demandOption: true,
        type: "string",
        describe: "URL to the GitHub pull request",
      });
    }
  ).argv;

const privateKey =
  parsedArgs.key === "-"
    ? await readStdIn(false)
    : parsedArgs.key && (await fs.readFile(parsedArgs.key as string));

const prUrlInfo = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/.exec(
  parsedArgs.prUrl as any
);

if (prUrlInfo == null) {
  throw new Error("Invalid PR URL");
}

const [, owner, repo, prNumber] = prUrlInfo;
console.warn(
  `Looking into GitHub pull request ${owner}/${repo}#${prNumber}...`
);

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
        createdAt
        merged
      }
      ${parsedArgs.protocol === "http" ? "" : "sshUrl"}
      ${parsedArgs.protocol === "ssh" ? "" : "url"}
      visibility
    }
    viewer {
      ${parsedArgs.login ? "" : "login"}
      ${parsedArgs.protocol ? "" : "publicKeys(first: 1) {totalCount}"}
    }
  }
`;

console.warn("Getting info from GitHub API...");
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

const {
  headRefName: branch,
  createdAt: startDate,
  merged,
  closed,
} = pullRequest;

if (merged || closed) {
  console.warn("The pull request seems to be closed.");
}

console.warn(`Locating vote.yml on commit ${sha}...`);
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

const handle = parsedArgs.login || data.viewer.login;

const protocol =
  parsedArgs.protocol ?? (data.viewer.publicKeys.totalCount ? "ssh" : "http");

function getHTTPRepoUrl(repoUrl: string, login: string) {
  const url = new URL(repoUrl + ".git");
  url.username = login;
  return url.toString();
}
const repoUrl =
  protocol === "ssh"
    ? data.repository.sshUrl
    : getHTTPRepoUrl(data.repository.url, handle);

console.warn("All relevant information has been retrieved:", {
  repoUrl,
  branch,
  subPath,
  sha,
  startDate,
});

const summary = await countFromGit({
  ...(await getEnv(parsedArgs)),
  repoUrl,
  branch,
  subPath,
  privateKey,
  firstCommitSha: sha,
  mailmap: parsedArgs.mailmap,
  decrypt: parsedArgs.decrypt,
  startDate,
});

if (parsedArgs.postComment) {
  await runChildProcessAsync(parsedArgs["gh-binary"] as string, [
    "pr",
    "comment",
    parsedArgs.prUrl,
    "-b",
    summary,
  ]);
} else {
  console.log(summary);
}
