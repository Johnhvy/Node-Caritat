#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import runChildProcessAsync from "../utils/runChildProcessAsync.js";

import voteUsingGit from "@aduh95/caritat/voteUsingGit";
import { cliArgs, getEnv } from "../utils/voteGitEnv.js";

const parsedArgs = await parseArgs()
  .options({
    ...cliArgs,

    // Disable CLI flags that are provided in the PR-url.
    repo: { hidden: true, string: true as const },
    branch: { hidden: true, string: true as const },
    path: { hidden: true, string: true as const },
    handle: { hidden: true, string: true as const },

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
    "gh-binary": {
      describe: "Path to the GitHub CLI executable",
      default: "gh",
      normalize: true,
      type: "string",
    },
  })
  .command(
    "$0 <pr-url>",
    "Extracts vote info from GitHub pull request, and starts a vote instance.",
    (yargs) => {
      yargs.positional("pr-url", {
        demandOption: true,
        type: "string",
        describe: "URL to the GitHub pull request",
      });
    }
  ).argv;

const prUrlInfo = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/.exec(
  (parsedArgs as typeof parsedArgs & { "pr-url"?: string })["pr-url"]
);

if (prUrlInfo == null) {
  throw new Error("Invalid PR URL");
}

const [, owner, repo, prNumber] = prUrlInfo;
console.log(`Looking into GitHub pull request ${owner}/${repo}#${prNumber}...`);

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
        headRef {
          name
          repository {
            ${parsedArgs.protocol === "http" ? "" : "sshUrl"}
            ${parsedArgs.protocol === "ssh" ? "" : "url"}
          }
        }
        closed
        merged
      }
    }
    viewer {
      ${parsedArgs.login ? "" : "login"}
      ${parsedArgs.protocol ? "" : "publicKeys(first: 1) {totalCount}"}
    }
  }
`;

console.log("Getting info from GitHub API...");
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
  headRef: { name: branch, repository },
  merged,
  closed,
} = pullRequest;

if (merged || closed) {
  console.warn("The pull request seems to be closed.");
}

console.log(`Locating vote.yml on commit ${sha}...`);
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

function getHTTPRepoURL(repoURL: string, login: string) {
  const url = new URL(repoURL + ".git");
  url.username = login;
  return url.toString();
}
const repoURL =
  protocol === "ssh"
    ? repository.sshUrl
    : getHTTPRepoURL(repository.url, handle);

console.log("All relevant information has been retrieved:", {
  repoURL,
  branch,
  subPath,

  handle,
});

await voteUsingGit({
  ...(await getEnv(parsedArgs)),
  repoURL,
  branch,
  subPath,
  handle,
});
