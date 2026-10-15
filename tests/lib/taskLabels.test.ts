import { describe, expect, it } from "vitest";
import { taskAvailability } from "~/lib/taskLabels";

const now = new Date("2026-10-15T12:00:00Z");
const standing = {
  userProofStatus: null,
  takenByAnother: false,
  userCooldownUntil: null,
};

describe("taskAvailability", () => {
  it("is open when nothing blocks the user", () => {
    expect(taskAvailability(standing, now)).toBe("open");
  });

  it("puts the user's own proof before anyone else's claim", () => {
    expect(
      taskAvailability(
        {
          ...standing,
          userProofStatus: "pending",
          takenByAnother: true,
        },
        now,
      ),
    ).toBe("pending");
    expect(
      taskAvailability(
        {
          ...standing,
          userProofStatus: "approved",
        },
        now,
      ),
    ).toBe("done");
  });

  it("is taken when another member holds an exclusive task", () => {
    expect(
      taskAvailability(
        {
          ...standing,
          takenByAnother: true,
        },
        now,
      ),
    ).toBe("taken");
  });

  it("only counts a cooldown that has not ended", () => {
    const later = new Date(now.getTime() + 60_000);
    const earlier = new Date(now.getTime() - 60_000);
    expect(
      taskAvailability(
        {
          ...standing,
          userCooldownUntil: later,
        },
        now,
      ),
    ).toBe("cooldown");
    expect(
      taskAvailability(
        {
          ...standing,
          userCooldownUntil: earlier,
        },
        now,
      ),
    ).toBe("open");
  });
});
