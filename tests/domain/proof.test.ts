import { describe, expect, it } from "vitest";
import {
  findRefusal,
  cooldownExpiresAt,
  isTerminal,
  reservesEntitlement,
  type SubmissionCheck,
} from "~/domain/proof";
import type { TaskPolicy } from "~/domain/task";

const now = new Date("2026-09-18T12:00:00Z");

function facts(overrides: Partial<SubmissionCheck> = {}): SubmissionCheck {
  return {
    policy: "one_per_user",
    taskArchived: false,
    cooldownSeconds: null,
    takenByAnyone: false,
    pendingByUser: false,
    completedByUser: false,
    lastApprovedAt: null,
    now,
    ...overrides,
  };
}

const allPolicies: Array<TaskPolicy> = ["single_winner", "one_per_user", "repeatable"];

describe("findRefusal", () => {
  it.each(allPolicies)("refuses an archived task under %s", (policy) => {
    expect(
      findRefusal(
        facts({
          policy,
          taskArchived: true,
        }),
      ),
    ).toBe("task_archived");
  });

  it.each(allPolicies)("refuses a duplicate pending proof under %s", (policy) => {
    expect(
      findRefusal(
        facts({
          policy,
          pendingByUser: true,
        }),
      ),
    ).toBe("already_pending");
  });

  describe("single_winner", () => {
    it("allows the first submitter", () => {
      expect(findRefusal(facts({ policy: "single_winner" }))).toBeNull();
    });

    it("refuses once anyone holds a pending or approved proof", () => {
      expect(
        findRefusal(
          facts({
            policy: "single_winner",
            takenByAnyone: true,
          }),
        ),
      ).toBe("already_taken");
    });
  });

  describe("one_per_user", () => {
    it("allows a user who has never completed it", () => {
      expect(findRefusal(facts({ policy: "one_per_user" }))).toBeNull();
    });

    it("refuses a second approved completion", () => {
      expect(
        findRefusal(
          facts({
            policy: "one_per_user",
            completedByUser: true,
          }),
        ),
      ).toBe("already_completed");
    });

    it("ignores other users' proofs", () => {
      expect(
        findRefusal(
          facts({
            policy: "one_per_user",
            takenByAnyone: true,
          }),
        ),
      ).toBeNull();
    });
  });

  describe("repeatable", () => {
    it("allows the first proof", () => {
      expect(
        findRefusal(
          facts({
            policy: "repeatable",
            cooldownSeconds: 3600,
          }),
        ),
      ).toBeNull();
    });

    it("refuses while the cooldown is still running", () => {
      expect(
        findRefusal(
          facts({
            policy: "repeatable",
            cooldownSeconds: 3600,
            lastApprovedAt: new Date(now.getTime() - 60_000),
          }),
        ),
      ).toBe("cooldown_active");
    });

    it("allows again once the cooldown has elapsed", () => {
      expect(
        findRefusal(
          facts({
            policy: "repeatable",
            cooldownSeconds: 3600,
            lastApprovedAt: new Date(now.getTime() - 3_600_001),
          }),
        ),
      ).toBeNull();
    });

    it("measures the cooldown from approved proofs only", () => {
      expect(
        findRefusal(
          facts({
            policy: "repeatable",
            cooldownSeconds: 3600,
            lastApprovedAt: null,
          }),
        ),
      ).toBeNull();
    });

    it("guards against unlimited duplicates when no cooldown is configured", () => {
      expect(
        findRefusal(
          facts({
            policy: "repeatable",
            cooldownSeconds: null,
            pendingByUser: true,
          }),
        ),
      ).toBe("already_pending");
    });
  });

  it("lets a user retry after a rejection", () => {
    expect(
      findRefusal(
        facts({
          policy: "one_per_user",
          pendingByUser: false,
          completedByUser: false,
        }),
      ),
    ).toBeNull();
  });
});

describe("cooldownExpiresAt", () => {
  it("is null when the user has no approved proof", () => {
    expect(cooldownExpiresAt(null, 3600)).toBeNull();
  });

  it("is null when no cooldown is configured", () => {
    expect(cooldownExpiresAt(now, null)).toBeNull();
  });

  it("adds the cooldown to the last approval", () => {
    expect(cooldownExpiresAt(now, 3600)?.toISOString()).toBe("2026-09-18T13:00:00.000Z");
  });
});

describe("proof status helpers", () => {
  it("treats approval as terminal", () => {
    expect(isTerminal("approved")).toBe(true);
    expect(isTerminal("pending")).toBe(false);
    expect(isTerminal("rejected")).toBe(false);
  });

  it("counts pending and approved proofs against the entitlement", () => {
    expect(reservesEntitlement("pending")).toBe(true);
    expect(reservesEntitlement("approved")).toBe(true);
    expect(reservesEntitlement("rejected")).toBe(false);
  });
});
