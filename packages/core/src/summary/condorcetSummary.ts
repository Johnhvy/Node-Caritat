import { Ballot, VoteCandidate } from "../vote";
import cleanMarkdown from "../utils/cleanMarkdown.js";
import ElectionSummary from "./electionSummary.js";

// @ts-ignore
const formatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

export function summarizeCondorcetBallot(
  ballot: Ballot,
  indentLength = 0
): string {
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

export default class CondorcetElectionSummary extends ElectionSummary {
  scoreText = "Number of won duels";

  summarizeBallot(ballot: Ballot) {
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
}
