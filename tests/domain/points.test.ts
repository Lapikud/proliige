import { describe, expect, it } from "vitest";
import { compareLeaderboardRows, type LeaderboardRow } from "~/domain/points";

const row = (displayName: string, totalPoints: number): LeaderboardRow => ({
  user: {
    id: displayName.toLowerCase(),
    displayName,
  },
  totalPoints,
  approvedProofs: 1,
});

describe("compareLeaderboardRows", () => {
  it("sorts by total points descending", () => {
    const sorted = [row("Ann", 10), row("Bob", 30), row("Cid", 20)].sort(compareLeaderboardRows);
    expect(sorted.map((r) => r.user.displayName)).toEqual(["Bob", "Cid", "Ann"]);
  });

  it("breaks ties by display name ascending", () => {
    const sorted = [row("Zoe", 10), row("Ann", 10), row("Mia", 10)].sort(compareLeaderboardRows);
    expect(sorted.map((r) => r.user.displayName)).toEqual(["Ann", "Mia", "Zoe"]);
  });

  it("applies the tie-break only within an equal-points group", () => {
    const sorted = [row("Ann", 5), row("Zoe", 50), row("Bob", 5)].sort(compareLeaderboardRows);
    expect(sorted.map((r) => r.user.displayName)).toEqual(["Zoe", "Ann", "Bob"]);
  });

  it("places a user on zero points last rather than omitting them", () => {
    const sorted = [row("Ann", 0), row("Bob", 1)].sort(compareLeaderboardRows);
    expect(sorted.map((r) => r.user.displayName)).toEqual(["Bob", "Ann"]);
  });
});
