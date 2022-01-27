import singleRound from "../dist/votingMethods/singleRound.js";

it("should return an empty map for an empty vote", () => {
  let result = singleRound([], []);

  expect(result.size).toBe(0);
});

it("should return a map for a vote", () => {
  let result = singleRound(
    ["a"],
    [
      {
        voter: { id: "b" },
        preferences: new Map([["a", 1]]),
      },
    ]
  );

  expect([...result]).toStrictEqual([["a", 1]]);

  expect([
    ...singleRound(
      ["a", "b"],
      [
        {
          voter: { id: "b" },
          preferences: new Map([["a", 1]]),
        },
      ]
    ),
  ]).toStrictEqual([
    ["a", 1],
    ["b", 0],
  ]);
});

it("should return a map for two votes", () => {
  let result = singleRound(
    ["a"],
    [
      {
        voter: { id: "b" },
        preferences: new Map([["a", 1]]),
      },
      {
        voter: { id: "c" },
        preferences: new Map([["a", 1]]),
      },
    ]
  );

  expect([...result]).toStrictEqual([["a", 2]]);
});
