import { Actor, VoteCandidate } from "../dist/vote";
import { CandidateScores } from "../dist/votingMethods/votingMethodlmplementation";

function createSummary({
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
  }End date: ${endDate}\n\nParticipants:\n\n${participants
    .map((actor) => `- ${actor.id}`)
    .join("\n")}\n\nParticipation: ${
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

const participants = [{ id: "a" }, { id: "b" }, { id: "c" }];
const winners = ["Option 2", "Option 3"];

const result = new Map([
  ["Option 1", 1],
  ["Option 2", 2],
  ["Option 3", 2],
  ["Option 4", 0],
]);

const summary = createSummary({
  subject: "test",
  startDate: new Date(),
  endDate: new Date(),
  participants,
  participation: 0.8,
  winners,
  result,
  privateKey:
    "--- BEGIN PRIVATE KEY ---\nthisisatotalyvalidbase64rsakeywhydoyouask\n--- END PRIVATE KEY ---",
});

it("should create a correct summary", () => {
  expect(summary).toBe("TODO");
});
