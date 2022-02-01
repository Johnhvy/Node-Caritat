import type { Actor, Ballot, VoteCandidate } from "../vote";
import type { CandidateScores } from "../votingMethods/votingMethodImplementation";

export default function createSummary({
  subject,
  startDate,
  endDate,
  participation,
  winners,
  result,
  ballots,
  privateKey,
}: {
  subject: string;
  startDate?: Date;
  endDate: Date;
  participation: number;
  winners: VoteCandidate[];
  result: CandidateScores;
  ballots: Ballot[];
  privateKey: string;
}): string {
  const sortedBallots = ballots
    .slice()
    .sort((a, b) => a.voter.id.localeCompare(b.voter.id));
  const participants = sortedBallots.map((ballot) => ballot.voter);
  return `# Election results
  
Subject: ${subject}
${startDate ? `Start date: ${startDate}\n` : ""}End date: ${endDate}

${
  participants
    ? "Participants:\n\n" +
      participants.map((actor, i) => `- ${actor.id}[^${i}]`).join("\n")
    : ""
}

Participation: ${Math.round(participation * 10_000) / 100}%
  
**Winning candidate(s)**: ${winners.join(", ")}
  
## Table of results

| Candidate | Number of won duels |
| --------- | ------------------- |
${Array.from(result)
  .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
  .map((result) => `| ${result[0]} | ${result[1]} |`)
  .join("\n")}
    
## Voting data

<details><summary>Private key used to encrypt ballots</summary>

${"```\n" + privateKey + "```"}

</details>

${ballots
  .map(
    (ballot, i) =>
      `[^${i}]: ${Array.from(ballot.preferences, (a) => a.join(": ")).join(
        ", "
      )}`
  )
  .join("\n")}\n`;
}
