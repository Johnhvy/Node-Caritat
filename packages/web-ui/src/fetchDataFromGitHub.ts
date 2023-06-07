const githubPRUrlPattern = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/;

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

  const voteUrl = prFiles.find((file) =>
    file.filename.endsWith("/vote.yml")
  )?.contents_url;
  if (!voteUrl) {
    throw new Error("Failed to find a vote.yml file in this PR");
  }

  return voteUrl;
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
    ] as [Promise<string>, Promise<ArrayBuffer>];
  } catch (err) {
    err = Promise.reject(err);
    return [err, err] as [never, never];
  }
}

let previousURL: string | null;
export default function fetchFromGitHub(
  { url, username, token }: { url: string; username?: string; token?: string },
  callback: (
    errOfResult: [Promise<string>, Promise<ArrayBuffer>]
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
