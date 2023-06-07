const githubPRUrlPattern = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/;
const rawGitHubUserContentURL = new URL("https://raw.githubusercontent.com/");

async function _fetchRawVoteURL(
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
  )?.raw_url;
  if (!voteUrl) {
    throw new Error("Failed to find a vote.yml file in this PR");
  }

  return new URL(
    new URL(voteUrl.replaceAll("%2F", "/")).pathname.replace("/raw/", "/"),
    rawGitHubUserContentURL
  );
}
let requestCache = new Map();
async function fetchRawVoteURL(
  url: string,
  fetchOptions: Parameters<typeof fetch>[1]
) {
  const cachedRequest = requestCache.get(url);
  if (cachedRequest != null) return cachedRequest;

  try {
    const rawVoteURL = _fetchRawVoteURL(url, fetchOptions);
    requestCache.set(url, rawVoteURL);
    return rawVoteURL;
  } catch (err) {
    requestCache.set(url, Promise.reject(err));
    throw err;
  }
}

async function act(
  url: string | URL,
  fetchOptions?: Parameters<typeof fetch>[1]
) {
  try {
    const voteUrl = await fetchRawVoteURL(url as string, fetchOptions);

    const ballotURL = new URL(`./ballot.yml`, voteUrl);
    const publicKeyURL = new URL(`./public.pem`, voteUrl);

    return [
      fetch(ballotURL as any as string, fetchOptions).then((response) =>
        response.ok
          ? response.text()
          : Promise.reject(
              new Error(
                `Fetch error: ${response.status} ${response.statusText}`
              )
            )
      ),
      fetch(publicKeyURL as any as string, fetchOptions).then((response) =>
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
  if (previousURL === url + options?.headers.Authorization) return;
  previousURL = url + options?.headers.Authorization;

  act(url, options).then(callback, (err) => {
    previousURL = null;
    return callback(err);
  });
}
