import { URL } from "url";

export class BallotPool {
  public ballots: { [author: string]: { url: URL; index: number } } =
    Object.create(null);
  private authorizedVoters: string[];

  constructor(authorizedVoters?: string[]) {
    this.authorizedVoters = authorizedVoters;
  }

  public addBallot({
    url,
    author,
  }: { url: URL; author?: string } | any): boolean {
    if (
      author != null &&
      (author in this.ballots ||
        (this.authorizedVoters != null &&
          !this.authorizedVoters.includes(author)))
    )
      return false;
    const index: number = 0;
    this.ballots[author] = { url, index };
    return true;
  }
}

export interface CommitNode {
  sha: string;
  author: string;
  isValid: boolean;
}

export default class BallotPoolGit extends BallotPool {
  private commits: CommitNode[];

  constructor(commitTree: CommitNode[], authorizedVoters?: string[]) {
    super();
    this.commits = commitTree;
    if (authorizedVoters != null) {
      for (const commit of this.commits) {
        commit.isValid &&= authorizedVoters.includes(commit.author);
      }
    }
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
      !isValid ||
      (author in this.ballots && index > this.ballots[author].index)
    ) {
      return false;
    }
    this.ballots[author] = { url, index };
    return true;
  }
}
