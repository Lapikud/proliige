import { describe, expect, it } from "vitest";
import {
  describeCooldownDuration,
  formatCooldownInput,
  parseCooldownInput,
} from "~/lib/taskDuration";

describe("cooldown duration input", () => {
  it.each([
    ["2m", 120],
    ["1d 4h", 100_800],
    ["1y 2mo 3d 4h 5m 6s", 36_993_906],
    ["0s", 0],
  ])("parses %s", (input, expected) => {
    expect(parseCooldownInput(input)).toBe(expected);
  });

  it.each(["", "2 minutes", "2m xyz", "1m 2m", "-1h", "1.5h"])(
    "rejects invalid input %s",
    (input) => {
      expect(parseCooldownInput(input)).toBeNull();
    },
  );

  it("formats seconds as shorthand and confirms the full duration", () => {
    expect(formatCooldownInput(120)).toBe("2m");
    expect(describeCooldownDuration(120)).toBe("The task can be resubmitted in 2 minutes.");
  });

  it("describes compound durations in full text", () => {
    expect(describeCooldownDuration(90_061)).toBe(
      "The task can be resubmitted in 1 day, 1 hour, 1 minute, and 1 second.",
    );
  });

  it("describes zero as immediate resubmission", () => {
    expect(describeCooldownDuration(0)).toBe("The task can be resubmitted immediately.");
  });
});
