import type { Actor, VoteCandidate } from "../vote";
import type { CandidateScores } from "../votingMethods/votingMethodImplementation";

export default function createSummary({
  subject,
  startDate,
  endDate,
  participants,
  participation,
  winners,
  result,
  ballots,
  privateKey,
}: {
  subject: string;
  startDate?: Date;
  endDate: Date;
  participants: Actor[];
  participation: number;
  winners: VoteCandidate[];
  result: CandidateScores;
  ballots?: string[];
  privateKey: string;
}): string {
  return `# Election results\n\nSubject:${subject}  \n${
    startDate ? `Start date: ${startDate}  \n` : ""
  }End date: ${endDate}${
    participants
      ? "\n\nParticipants:\n\n" +
        participants.map((actor) => `- ${actor.id}`).join("\n")
      : ""
  }\n\nParticipation: ${
    participation * 100
  }%\n\n**Winning candidate(s)**: ${winners.join(
    ", "
  )}\n\n## Table of results\n\n| Candidate | Number of won duels |\n| --------- | ------------------- |\n${[
    ...result,
  ]
    .map((result) => `| ${result[0]} | ${result[1]} |`)
    .join("\n")}\n\n## Full voting data\n\n${
    ballots
      ? `<details><summary>Ballots</summary>\n\n${"```yaml"}\n${ballots.join(
          "```\n\n```yaml\n"
        )}\n${"```"}\n\n</details>\n\n`
      : ""
  }<details><summary>Private key used to encrypt ballots</summary>\n\n\`\`\`\n${privateKey}\n\`\`\`\n\n</details>\n`;
}
