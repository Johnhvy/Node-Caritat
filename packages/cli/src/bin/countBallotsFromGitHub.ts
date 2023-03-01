#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";
import countFromGit from "@aduh95/caritat/countBallotsFromGit";
import { cliArgs, getEnv } from "../utils/countBallotsGitEnv.js";
import readStdIn from "../utils/readStdin.js";
import fs from "fs/promises";

const parsedArgs = await parseArgs()
  .options({
    ...cliArgs,

    // Disable CLI flags that are provided in the PR-url.
    repo: { hidden: true } as never,
    branch: { hidden: true } as never,
    path: { hidden: true } as never,
    handle: { hidden: true } as never,

    protocol: {
      describe:
        "the protocol to use to pull the remote repository, either SSH or " +
        "HTTP (defaults to SSH if a public SSH key is found for the current " +
        "user, otherwise default to HTTP)",
      string: true,
    },
    login: {
      describe:
        "GitHub handle (if not provided, will be fetched using GitHub CLI)",
      string: true,
    },
    "post-comment": {
      describe:
        "Post the comment containing the election summary to the pull request",
      default: false,
      type: "boolean",
    },
    "commit-json-summary": {
      describe:
        "Delete all encrypted ballots and commit instead a JSON file containing all ballots",
      default: false,
      type: "boolean",
    },
    "gh-binary": {
      describe: "Path to the GitHub CLI executable",
      default: "gh",
      normalize: true,
      string: true,
    },
    ["key-part"]: {
      ...cliArgs["key-part"],
      describe:
        cliArgs["key-part"].describe +
        " If not provided, it will be extracted from the PR comments.",
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
    : parsedArgs.key && (await fs.readFile(parsedArgs.key));

const prUrlInfo = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/.exec(
  parsedArgs["pr-url"] as string
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
    parsedArgs["gh-binary"],
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
  parsedArgs["gh-binary"],
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

async function getKeyPartsFromComments() {
  const shamirKeyPartComment =
    /\n-----BEGIN SHAMIR KEY PART-----\n([a-zA-Z0-9+/\s]+={0,2})\n-----END SHAMIR KEY PART-----\n/;
  const { comments } = JSON.parse(
    await runChildProcessAsync(
      parsedArgs["gh-binary"] as string,
      ["pr", "view", parsedArgs["pr-url"], "--json", "comments"],
      { captureStdout: true }
    )
  );

  const results = [];
  for (const { body } of comments) {
    const match = shamirKeyPartComment.exec(body);
    if (match) {
      results.push(Buffer.from(match[1], "base64"));
    }
  }
  return results;
}

const { result: summary, privateKey: _privateKey } = await countFromGit({
  ...(await getEnv(parsedArgs)),
  repoUrl,
  branch,
  subPath,
  privateKey,
  keyParts: parsedArgs["key-part"] ?? (await getKeyPartsFromComments()),
  firstCommitSha: sha,
  mailmap: parsedArgs.mailmap,
  commitJsonSummary: parsedArgs["commit-json-summary"]
    ? {
        refs: [parsedArgs["pr-url"] as string],
      }
    : null,
});

if (parsedArgs["post-comment"]) {
  await runChildProcessAsync(parsedArgs["gh-binary"], [
    "pr",
    "comment",
    parsedArgs["pr-url"],
    "-b",
    summary.generateSummary(_privateKey.toString()),
  ]);
} else {
  console.log(
    "To publish the results, you should use `--post-comment --commit-json-summary` CLI flags."
  );
  console.log(
    "Participation:",
    Math.round(summary.participation * 100_00) / 1_00,
    "%"
  );
  console.log("Raw results:", summary.result);
}
