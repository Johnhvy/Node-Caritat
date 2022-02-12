import type { Actor, Ballot, VoteCandidate, VoteCommit } from "../vote";
import type { CandidateScores } from "../votingMethods/votingMethodImplementation";
import cleanMarkdown from "../utils/cleanMarkdown.js";

function displayWinners(winners: VoteCandidate[]) {
  if (winners.length === 0) return "None.";
  if (winners.length === 1) return cleanMarkdown(winners[0]);
  const delimiter = "\n - ";
  return delimiter + winners.map(cleanMarkdown).join(delimiter);
}

export interface DiscardedCommit {
  commitInfo: VoteCommit;
  reason: string;
}
export interface ElectionSummaryOptions {
  subject: string;
  startDate?: string;
  endDate: string;
  participation: number;
  winners: VoteCandidate[];
  result: CandidateScores;
  ballots: Ballot[];
  privateKey: string;
  discardedCommits?: DiscardedCommit[];
}
export default abstract class ElectionSummary {
  subject: string;
  startDate?: string;
  endDate: string;
  participation: number;
  winners: VoteCandidate[];
  result: CandidateScores;
  sortedBallots: Ballot[];
  privateKey: string;
  participants: Actor[];
  discardedCommits: DiscardedCommit[];

  abstract scoreText: string;

  constructor({
    subject,
    startDate,
    endDate,
    participation,
    winners,
    result,
    ballots: unsortedBallots,
    privateKey,
    discardedCommits,
  }: ElectionSummaryOptions) {
    this.subject = subject;
    this.startDate = startDate;
    this.endDate = endDate;
    this.participation = participation;
    this.winners = winners;
    this.result = result;
    this.discardedCommits = discardedCommits;

    this.sortedBallots = unsortedBallots
      .slice()
      .sort((a, b) => a.voter.id.localeCompare(b.voter.id));
    this.participants = this.sortedBallots.map((ballot) => ballot.voter);

    this.privateKey = privateKey;
  }

  abstract summarizeBallot(ballot: Ballot): string;

  public toString() {
    return `# Election results

**Subject**: ${cleanMarkdown(this.subject)}  
${this.startDate ? `**Start date**: ${this.startDate}  \n` : ""}**End date**: ${
      this.endDate
    }  
**Participation**: ${Math.round(this.participation * 10_000) / 100}%

## Results

**Winning candidate${this.winners.length === 1 ? "" : "s"}**: ${displayWinners(
      this.winners
    )}

### Table of results

| Candidate | ${this.scoreText} |
| --------- | ------------------- |
${Array.from(this.result)
  .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
  .map((result) => `| ${cleanMarkdown(result[0])} | ${result[1]} |`)
  .join("\n")}

## Voting data

${
  this.participants
    ? "**Participants**:\n\n" +
      this.participants
        .map((actor, i) => `- ${cleanMarkdown(actor.id)}[^${i}]`)
        .join("\n")
    : ""
}

<details><summary>Private key to decrypt ballots</summary>

${"```"}
${this.privateKey}
${"```"}

</details>
${
  this.discardedCommits?.length
    ? `
<details><summary>Discarded commits</summary>

Some commits have not been taken into account when counting the ballots:

${"```json"}
${JSON.stringify(this.discardedCommits, undefined, 2)}
${"```"}

</details>`
    : ""
}

${this.sortedBallots
  .map((ballot, i) => `[^${i}]: ${this.summarizeBallot(ballot)}`)
  .join("\n")}\n`;
  }
}
