import { Ballot, VoteCandidate } from "../vote";
import cleanMarkdown from "../utils/cleanMarkdown.js";
import ElectionSummary from "./electionSummary.js";

// @ts-ignore
const formatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

export function summarizeCondorcetBallotForElectionSummary(
  ballot: BallotSummarize,
  indentLength = 0
): string {
  if (ballot.abstain) return "Abstained.";
  if (ballot.maxCandidates && ballot.minCandidates) {
    const { maxCandidates, minCandidates } = ballot;
    if (maxCandidates.length <= minCandidates.length) {
      return "Voted for " + formatter.format(maxCandidates) + ".";
    } else {
      return "Voted against " + formatter.format(minCandidates) + ".";
    }
  }
  const indent = " ".repeat(indentLength);
  return ballot.orderedCandidates
    .map(
      (candidates, i) => `${indent}${i + 1}. ${formatter.format(candidates)}.`
    )
    .join("\n");
}
export function summarizeCondorcetBallotForVoter(
  ballot: BallotSummarize,
  indentLength = 0
): string {
  if (ballot.abstain) return "You are abstaining from this vote.";
  if (ballot.maxCandidates && ballot.minCandidates) {
    const { maxCandidates, minCandidates } = ballot;
    return (
      `Your favorite option(s) is/are:\n - ${maxCandidates.join(".\n - ")}.\n` +
      `\n` +
      `Your least favorite option(s) is/are:\n - ${minCandidates.join(
        ".\n - "
      )}.\n` +
      `\n` +
      `Your are voting ${
        maxCandidates.length <= minCandidates.length
          ? "for " + formatter.format(maxCandidates)
          : "against " + formatter.format(minCandidates)
      }.`
    );
  }
  const indent = " ".repeat(indentLength);
  return (
    `Your favorite option(s) is/are:\n - ${ballot.orderedCandidates[0].join(
      ".\n - "
    )}.\n` +
    `\n` +
    `Your least favorite option(s) is/are:\n - ${ballot.orderedCandidates
      .at(-1)
      .join(".\n - ")}.\n` +
    `\n` +
    "The complete list of your preferences is:\n" +
    ballot.orderedCandidates
      .map(
        (candidates, i) => `${indent}${i + 1}. ${formatter.format(candidates)}.`
      )
      .join("\n")
  );
}

interface BallotSummarize {
  abstain?: boolean;
  maxCandidates?: VoteCandidate[];
  minCandidates?: VoteCandidate[];
  orderedCandidates?: VoteCandidate[][];
}
export function getSummarizedBallot(ballot: Ballot): BallotSummarize {
  let maxNote = Number.MIN_SAFE_INTEGER;
  let minNote = Number.MAX_SAFE_INTEGER;
  for (const [, score] of ballot.preferences) {
    if (score > maxNote) maxNote = score;
    if (score < minNote) minNote = score;
  }

  if (minNote === maxNote) return { abstain: true };

  let minCandidates = [];
  let maxCandidates = [];
  for (const [candidate, score] of ballot.preferences) {
    if (score !== minNote && score !== maxNote) {
      const orderedPreferences = new Map() as Map<number, VoteCandidate[]>;
      for (const [candidate, score] of ballot.preferences) {
        const candidatesForThisScore = orderedPreferences.get(score);
        const markdownCandidate = `**${cleanMarkdown(
          candidate.replace(/\.$/, "")
        )}**`;
        if (candidatesForThisScore == null) {
          orderedPreferences.set(score, [markdownCandidate]);
        } else {
          candidatesForThisScore.push(markdownCandidate);
        }
      }
      return {
        orderedCandidates: Array.from(orderedPreferences)
          .sort((a, b) => b[0] - a[0])
          .map(([, candidates]) => candidates),
      };
    }
    const group = score === minNote ? minCandidates : maxCandidates;
    group.push(`**${cleanMarkdown(candidate).replace(/\.$/, "")}**`);
  }
  return { minCandidates, maxCandidates };
}

export default class CondorcetElectionSummary extends ElectionSummary {
  scoreText = "Number of won duels";

  summarizeBallot(ballot: Ballot) {
    return summarizeCondorcetBallotForElectionSummary(
      getSummarizedBallot(ballot),
      4
    );
  }
}
