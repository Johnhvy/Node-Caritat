import findWinners from "../dist/utils/findWinner";

it("should find the winner based on the scores of the candidates", () => {
  expect(
    Array.from(
      findWinners(
        new Map([
          ["a", 2],
          ["b", 1],
          ["c", 0],
        ])
      )
    )
  ).toStrictEqual(["a"]);
  expect(
    Array.from(
      findWinners(
        new Map([
          ["a", 1],
          ["b", 2],
          ["c", 0],
        ])
      )
    )
  ).toStrictEqual(["b"]);
  expect(
    Array.from(
      findWinners(
        new Map([
          ["a", 1],
          ["b", 0],
          ["c", 2],
        ])
      )
    )
  ).toStrictEqual(["c"]);
});

it("should find 3 winners", () => {
  expect(
    Array.from(
      findWinners(
        new Map([
          ["a", 1],
          ["c", 1],
          ["b", 1],
        ])
      )
    ).sort()
  ).toStrictEqual(["a", "b", "c"]);
});
