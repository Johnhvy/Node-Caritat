import type { Ballot, VoteCandidate } from "../vote";
import type { CandidateScores } from "../votingMethods/votingMethodImplementation";
import cleanMarkdown from "./cleanMarkdown.js";

// @ts-ignore
const formatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

function displayWinners(winners: VoteCandidate[]) {
  if (winners.length === 0) return "None.";
  if (winners.length === 1) return cleanMarkdown(winners[0]);
  const delimiter = "\n - ";
  return delimiter + winners.map(cleanMarkdown).join(delimiter);
}

function summarizeCondorcetBallot(ballot: Ballot, indentLength = 0) {
  const orderedPreferences = new Map() as Map<number, VoteCandidate[]>;
  for (const [candidate, score] of ballot.preferences) {
    const candidatesForThisScore = orderedPreferences.get(score);
    const markdownCandidate = `**${cleanMarkdown(candidate)}**`;
    if (candidatesForThisScore == null) {
      orderedPreferences.set(score, [markdownCandidate]);
    } else {
      candidatesForThisScore.push(markdownCandidate);
    }
  }
  const indent = " ".repeat(indentLength);
  return Array.from(orderedPreferences)
    .sort((a, b) => b[0] - a[0])
    .map(
      ([, candidates], i) =>
        `${indent}${i + 1}. ${formatter.format(candidates)}`
    )
    .join("\n");
}
function summarizeBallot(ballot: Ballot) {
  let maxNote = Number.MIN_SAFE_INTEGER;
  let minNote = Number.MAX_SAFE_INTEGER;
  for (const [, score] of ballot.preferences) {
    if (score > maxNote) maxNote = score;
    if (score < minNote) minNote = score;
  }

  if (minNote === maxNote) return "Abstained.";

  let minCandidates = [];
  let maxCandidates = [];
  for (const [candidate, score] of ballot.preferences) {
    if (score !== minNote && score !== maxNote) {
      return "Order of preference:\n" + summarizeCondorcetBallot(ballot, 4);
    }
    const group = score === minNote ? minCandidates : maxCandidates;
    group.push(`**${cleanMarkdown(candidate)}**`);
  }
  if (maxCandidates.length <= minCandidates.length) {
    return "Voted for " + formatter.format(maxCandidates) + ".";
  } else {
    return "Voted against " + formatter.format(minCandidates) + ".";
  }
}

export default function createSummary({
  subject,
  startDate,
  endDate,
  participation,
  winners,
  result,
  ballots: unsortedBallots,
  privateKey,
}: {
  subject: string;
  startDate?: string;
  endDate: string;
  participation: number;
  winners: VoteCandidate[];
  result: CandidateScores;
  ballots: Ballot[];
  privateKey: string;
}): string {
  const sortedBallots = unsortedBallots
    .slice()
    .sort((a, b) => a.voter.id.localeCompare(b.voter.id));
  const participants = sortedBallots.map((ballot) => ballot.voter);
  return `# Election results

Subject: ${cleanMarkdown(subject)}  
${startDate ? `Start date: ${startDate}  \n` : ""}End date: ${endDate}

${
  participants
    ? "Participants:\n\n" +
      participants
        .map((actor, i) => `- ${cleanMarkdown(actor.id)}[^${i}]`)
        .join("\n")
    : ""
}

Participation: ${Math.round(participation * 10_000) / 100}%

**Winning candidate${winners.length === 1 ? "" : "s"}**: ${displayWinners(
    winners
  )}

## Table of results

| Candidate | Number of won duels |
| --------- | ------------------- |
${Array.from(result)
  .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
  .map((result) => `| ${cleanMarkdown(result[0])} | ${result[1]} |`)
  .join("\n")}

## Voting data

<details><summary>Private key to decrypt ballots</summary>

${"```"}
${privateKey}
${"```"}

</details>

${sortedBallots
  .map((ballot, i) => `[^${i}]: ${summarizeBallot(ballot)}`)
  .join("\n")}\n`;
}
