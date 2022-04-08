const githubPRUrlPattern = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/;
const rawGitHubUserContentURL = new URL("https://raw.githubusercontent.com/");

async function _fetchRawVoteURL(url) {
  const prUrl = new URL(url);
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
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`
  ).then((response) =>
    response.ok
      ? response.json()
      : Promise.reject(
          new Error(`Fetch error: ${response.status} ${response.statusText}`)
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
async function fetchRawVoteURL(url: string) {
  const cachedRequest = requestCache.get(url);
  if (cachedRequest != null) return cachedRequest;

  try {
    const rawVoteURL = _fetchRawVoteURL(url);
    requestCache.set(url, rawVoteURL);
    return rawVoteURL;
  } catch (err) {
    requestCache.set(url, Promise.reject(err));
    throw err;
  }
}

async function act(url) {
  try {
    const voteUrl = await fetchRawVoteURL(url);

    const ballotURL = new URL(`./ballot.yml`, voteUrl);
    const publicKeyURL = new URL(`./public.pem`, voteUrl);

    return [
      fetch(ballotURL as any as string).then((response) =>
        response.ok
          ? response.text()
          : Promise.reject(
              new Error(
                `Fetch error: ${response.status} ${response.statusText}`
              )
            )
      ),
      fetch(publicKeyURL as any as string).then((response) =>
        response.ok
          ? response.arrayBuffer()
          : Promise.reject(
              new Error(
                `Fetch error: ${response.status} ${response.statusText}`
              )
            )
      ),
    ];
  } catch (err) {
    err = Promise.reject(err);
    return [err, err];
  }
}

let previousURL: string;
export default function fetchFromGitHub(
  url: string,
  callback: (errOfResult: [Promise<string>, Promise<string>]) => void
) {
  if (previousURL === url) return;
  previousURL = url;

  act(url).then(callback, callback);
}
