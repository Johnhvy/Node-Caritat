import condorcet from "../dist/votingMethods/condorcet.js";

it("should return an empty map for an empty vote", () => {
  let result = condorcet([], []);

  expect(result.size).toBe(0);
});

it("should return a map for a vote", () => {
  let result = condorcet(
    ["a"],
    [
      {
        voter: { id: "1" },
        preferences: new Map([["a", 1]]),
      },
    ]
  );

  expect([...result]).toStrictEqual([["a", 0]]);

  expect([
    ...condorcet(
      ["a", "b"],
      [
        {
          voter: { id: "1" },
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
  let result = condorcet(
    ["a"],
    [
      {
        voter: { id: "1" },
        preferences: new Map([["a", 1]]),
      },
      {
        voter: { id: "2" },
        preferences: new Map([["a", 1]]),
      },
    ]
  );

  expect([...result]).toStrictEqual([["a", 0]]);
});

it("should return the correct result", () => {
  expect([
    ...condorcet(
      ["a", "b"],
      [
        {
          voter: { id: "1" },
          preferences: new Map([["a", 1]]),
        },
        {
          voter: { id: "2" },
          preferences: new Map([["a", 1]]),
        },
      ]
    ),
  ]).toStrictEqual([
    ["a", 1],
    ["b", 0],
  ]);
  expect([
    ...condorcet(
      ["a", "b"],
      [
        {
          voter: { id: "1" },
          preferences: new Map([["b", 1]]),
        },
        {
          voter: { id: "2" },
          preferences: new Map([["b", 1]]),
        },
      ]
    ),
  ]).toStrictEqual([
    ["a", 0],
    ["b", 1],
  ]);
  expect([
    ...condorcet(
      ["a", "b"],
      [
        {
          voter: { id: "1" },
          preferences: new Map([["a", 1]]),
        },
        {
          voter: { id: "2" },
          preferences: new Map([["b", 1]]),
        },
        {
          voter: { id: "3" },
          preferences: new Map([["b", 1]]),
        },
      ]
    ),
  ]).toStrictEqual([
    ["a", 0],
    ["b", 1],
  ]);
  expect([
    ...condorcet(
      ["a", "b", "c"],
      [
        {
          voter: { id: "1" },
          preferences: new Map([
            ["a", 1],
            ["b", 0.5],
          ]),
        },
        {
          voter: { id: "2" },
          preferences: new Map([
            ["b", 1],
            ["c", 0.5],
          ]),
        },
        {
          voter: { id: "3" },
          preferences: new Map([
            ["c", 1],
            ["a", 0.5],
          ]),
        },
      ]
    ),
  ]).toStrictEqual([
    ["a", 1],
    ["b", 1],
    ["c", 1],
  ]);
  expect([
    ...condorcet(
      ["a", "b", "c"],
      [
        {
          voter: { id: "1" },
          preferences: new Map([
            ["a", 1],
            ["b", 0.5],
          ]),
        },
        {
          voter: { id: "2" },
          preferences: new Map([
            ["b", 1],
            ["a", 0.5],
          ]),
        },
        {
          voter: { id: "3" },
          preferences: new Map([
            ["c", 1],
            ["a", 0.5],
          ]),
        },
      ]
    ),
  ]).toStrictEqual([
    ["a", 2],
    ["b", 1],
    ["c", 0],
  ]);
});
