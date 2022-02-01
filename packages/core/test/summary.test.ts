import createSummary from "../dist/utils/createSummary.js";

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

it("should contain winners", () => {
  const summaryWinners = summary
    .match(/\*\*Winning candidate\(s\)\*\*\: (.*)/)[1]
    .split(",")
    .map((winner) => winner.trim());
  expect(summaryWinners).toStrictEqual(winners);
});
