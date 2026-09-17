import { describe, expect, it } from "vitest";
import { completionPolicies, type ProofSnapshot, standingOf } from "~/domain/completionPolicy";
import { taskPolicies } from "~/domain/task";

const now = new Date("2026-09-18T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

const proof = (overrides: Partial<ProofSnapshot>): ProofSnapshot => ({
  userId: "alice",
  status: "approved",
  reviewedAt: hoursAgo(1),
  ...overrides,
});

describe("completion policy strategies", () => {
  it("defines a strategy for every policy", () => {
    expect(Object.keys(completionPolicies).sort()).toEqual([...taskPolicies].sort());
  });

  it("only repeatable uses a cooldown, only single_winner is exclusive", () => {
    const flags = Object.entries(completionPolicies).map(([name, p]) => [
      name,
      p.usesCooldown,
      p.exclusive,
    ]);
    expect(flags).toEqual([
      ["single_winner", false, true],
      ["one_per_user", false, false],
      ["repeatable", true, false],
    ]);
  });
});

describe("standingOf", () => {
  it("counts the user's approved proofs", () => {
    const standing = standingOf([proof({})], "alice");
    expect(standing.completedByUser).toBe(true);
  });

  it("ignores rejected proofs when deciding whether a task is taken", () => {
    const standing = standingOf(
      [
        proof({
          userId: "bob",
          status: "rejected",
        }),
      ],
      "alice",
    );
    expect(standing.takenByAnyone).toBe(false);
  });

  it("uses the latest approval for the cooldown, never a rejection", () => {
    const standing = standingOf(
      [
        proof({ reviewedAt: hoursAgo(10) }),
        proof({ reviewedAt: hoursAgo(2) }),
        proof({
          status: "rejected",
          reviewedAt: hoursAgo(1),
        }),
      ],
      "alice",
    );
    expect(standing.lastApprovedAt?.getTime()).toBe(hoursAgo(2).getTime());
    expect(
      completionPolicies.repeatable.refuse({
        ...standing,
        cooldownSeconds: 3 * 3600,
        now,
      }),
    ).toBe("cooldown_active");
    expect(
      completionPolicies.repeatable.refuse({
        ...standing,
        cooldownSeconds: 3600,
        now,
      }),
    ).toBeNull();
  });
});

describe("repeatable without a cooldown", () => {
  it("never refuses, even when the last approval is timestamped after now", () => {
    const standing = standingOf([proof({ reviewedAt: new Date(now.getTime() + 60_000) })], "alice");
    expect(
      completionPolicies.repeatable.refuse({
        ...standing,
        cooldownSeconds: 0,
        now,
      }),
    ).toBeNull();
    expect(
      completionPolicies.repeatable.refuse({
        ...standing,
        cooldownSeconds: null,
        now,
      }),
    ).toBeNull();
  });
});
