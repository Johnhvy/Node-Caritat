class BallotPool {}

export interface CommitNode {
  sha: string;
  author: string;
  isValid: boolean;
}

export default class BallotPoolGit extends BallotPool {
  private ballots: { [author: string]: { url: URL; index: number } } =
    Object.create(null);
  private commits: CommitNode[];
  private authorizedVoters: string[];

  constructor(commitTree: CommitNode[], voterWhiteList?: string[]) {
    super();
    this.commits = commitTree;
    this.authorizedVoters = voterWhiteList;
  }

  public addBallot({
    url,
    commitSha,
  }: {
    url: URL;
    commitSha: string;
  }): boolean {
    const index = this.commits.findIndex((node) => node.sha === commitSha);
    if (index === -1) return false;
    const { author, isValid } = this.commits[index];
    if (
      (this.authorizedVoters !== undefined &&
        this.authorizedVoters.indexOf(author) < 0) ||
      !isValid ||
      (author in this.ballots && index > this.ballots[author].index)
    ) {
      return false;
    }
    this.ballots[author] = { url, index };
    return true;
  }
}
