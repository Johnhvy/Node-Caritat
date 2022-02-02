import CondorcetSummary from "../dist/summary/condorcetSummary";

const participants = [{ id: "a" }, { id: "b" }, { id: "c" }];
const winners = ["Option 2", "Option 3"];

const result = new Map([
  ["Option 1", 1],
  ["Option 2", 2],
  ["Option 3", 2],
  ["Option 4", 0],
]);

const summary = new CondorcetSummary({
  subject: "test",
  startDate: "",
  endDate: "",
  participation: 0.8,
  winners,
  result,
  ballots: [{ voter: participants[0], preferences: result }],
  privateKey:
    "--- BEGIN PRIVATE KEY ---\nthisisatotalyvalidbase64rsakeywhydoyouask\n--- END PRIVATE KEY ---",
}).toString();

it("should contain winners", () => {
  const summaryWinners = summary
    .match(/\*\*Winning candidate.*\*\*\: (.*)/)[1]
    .split(", ")
    .map((winner) => winner.trim());
  expect(summaryWinners).toStrictEqual([""]);
});
