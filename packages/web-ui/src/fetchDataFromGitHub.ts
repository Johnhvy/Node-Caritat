const githubPRUrlPattern = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/;

const branchInfoCache = new Map();
async function fetchRawVoteURL(
  url: string | URL,
  fetchOptions: Parameters<typeof fetch>[1]
) {
  const prUrl = new URL(url as string);
  if (prUrl.origin !== "https://github.com") {
    throw new Error(
      "Only GitHub PR URLs are supported on the web UI. Use the CLI instead."
    );
  }
  const prUrlMatch = githubPRUrlPattern.exec(prUrl.pathname);
  if (prUrlMatch == null) {
    throw new Error(
      "Only GitHub PR URLs are supported on the web UI. Use the CLI instead."
    );
  }
  const [, owner, repo, number] = prUrlMatch;
  const prFiles = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`,
    fetchOptions
  ).then((response) =>
    response.ok
      ? response.json()
      : Promise.reject(
          new Error(`Fetch error: ${response.status} ${response.statusText}`, {
            cause: response,
          })
        )
  );

  const voteFileInfo = prFiles.find((file) =>
    file.filename.endsWith("/vote.yml")
  );
  if (!voteFileInfo) {
    throw new Error("Failed to find a vote.yml file in this PR");
  }

  const {
    head: {
      repo: { html_url },
      ref,
    },
  } = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    fetchOptions
  ).then((response) =>
    response.ok
      ? response.json()
      : Promise.reject(
          new Error(`Fetch error: ${response.status} ${response.statusText}`, {
            cause: response,
          })
        )
  );

  branchInfoCache.set(
    url,
    `${html_url}/new/${ref}/${voteFileInfo.filename.replace(/vote\.yml$/, "")}`
  );

  return voteFileInfo.contents_url;
}

export function fetchNewVoteFileURL(url: string | URL) {
  return branchInfoCache.get(url);
}

async function act(
  url: string | URL,
  fetchOptions?: Parameters<typeof fetch>[1]
) {
  const contentsFetchOptions = {
    ...fetchOptions,
    headers: {
      ...fetchOptions?.headers,
      Accept: "application/vnd.github.raw",
    },
  };
  try {
    const voteUrl = await fetchRawVoteURL(url as string, fetchOptions);

    const ballotURL = voteUrl.replace(/vote\.yml(\?ref=\w+)$/, "ballot.yml$1");
    const publicKeyURL = voteUrl.replace(
      /vote\.yml(\?ref=\w+)$/,
      "public.pem$1"
    );
    const shouldShuffleCandidates = await fetch(voteUrl,contentsFetchOptions).then((response)=>response.ok?response.text().then(txt=>txt.split("canShuffleCandidates: ")[1].startsWith("true")):false)
    return [
      fetch(ballotURL, contentsFetchOptions).then((response) =>
        response.ok
          ? response.text()
          : Promise.reject(
              new Error(
                `Fetch error: ${response.status} ${response.statusText}`
              )
            )
      ),
      fetch(publicKeyURL, contentsFetchOptions).then((response) =>
        response.ok
          ? response.arrayBuffer()
          : Promise.reject(
              new Error(
                `Fetch error: ${response.status} ${response.statusText}`
              )
            )
      ),
      shouldShuffleCandidates
    ] as [Promise<string>, Promise<ArrayBuffer>, boolean];
  } catch (err) {
    err = Promise.reject(err);
    return [err, err, false] as [never, never, boolean];
  }
}

let previousURL: string | null;
export default function fetchFromGitHub(
  { url, username, token }: { url: string; username?: string; token?: string },
  callback: (
    errOfResult: [Promise<string>, Promise<ArrayBuffer>, boolean]
  ) => void | Promise<void>
) {
  const options =
    username && token
      ? {
          headers: {
            Authorization: `Basic ${btoa(`${username}:${token}`)}`,
          },
        }
      : undefined;
  const serializedURL = url + options?.headers.Authorization;
  if (previousURL === serializedURL) return;
  previousURL = serializedURL;

  act(url, options).then(callback, (err) => {
    previousURL = null;
    return callback(err);
  });
}
