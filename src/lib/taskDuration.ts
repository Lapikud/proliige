const units = [
  {
    suffix: "y",
    seconds: 365 * 24 * 60 * 60,
    label: "year",
  },
  {
    suffix: "mo",
    seconds: 30 * 24 * 60 * 60,
    label: "month",
  },
  {
    suffix: "d",
    seconds: 24 * 60 * 60,
    label: "day",
  },
  {
    suffix: "h",
    seconds: 60 * 60,
    label: "hour",
  },
  {
    suffix: "m",
    seconds: 60,
    label: "minute",
  },
  {
    suffix: "s",
    seconds: 1,
    label: "second",
  },
] as const;

const maxSeconds = 2_147_483_647;

export function parseCooldownInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^0+$/.test(trimmed)) return 0;

  let cursor = 0;
  let seconds = 0;
  const usedUnits = new Set<string>();
  const token = /(\d+)(mo|y|d|h|m|s)/gy;

  while (cursor < trimmed.length) {
    while (trimmed[cursor] === " ") cursor += 1;
    token.lastIndex = cursor;
    const match = token.exec(trimmed);
    const suffix = match?.[2];
    if (!match || suffix === undefined || usedUnits.has(suffix)) return null;

    usedUnits.add(suffix);
    const unit = units.find(({ suffix: candidate }) => candidate === suffix);
    if (!unit) return null;
    seconds += Number(match[1]) * unit.seconds;
    if (!Number.isSafeInteger(seconds) || seconds > maxSeconds) return null;
    cursor = token.lastIndex;
    if (cursor < trimmed.length && trimmed[cursor] !== " ") return null;
  }

  return seconds;
}

export function formatCooldownInput(seconds: number): string {
  if (!Number.isSafeInteger(seconds) || seconds < 0) return "";
  if (seconds === 0) return "0";

  let remaining = seconds;
  const parts: Array<string> = [];
  for (const unit of units) {
    const count = Math.floor(remaining / unit.seconds);
    if (count > 0) {
      parts.push(`${count}${unit.suffix}`);
      remaining %= unit.seconds;
    }
  }

  return parts.join(" ");
}

export function describeCooldownDuration(seconds: number): string {
  if (seconds === 0) return "The task can be resubmitted immediately.";

  let remaining = seconds;
  const parts: Array<string> = [];
  for (const unit of units) {
    const count = Math.floor(remaining / unit.seconds);
    if (count > 0) {
      parts.push(`${count} ${unit.label}${count === 1 ? "" : "s"}`);
      remaining %= unit.seconds;
    }
  }

  let duration: string;
  if (parts.length === 1) {
    duration = parts[0] ?? "";
  } else {
    duration = `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1) ?? ""}`;
  }

  return `The task can be resubmitted in ${duration}.`;
}
