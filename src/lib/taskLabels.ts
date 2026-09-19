import { completionPolicy } from "~/domain/completionPolicy";
import type { TaskPolicy } from "~/domain/task";

export const describeTaskPolicy = (policy: TaskPolicy): string => completionPolicy(policy).label;

export function describeCooldown(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) {
    return null;
  }
  const hours = Math.round(seconds / 3600);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(hours / 24);

  return `${days} day${days === 1 ? "" : "s"}`;
}

interface Availability {
  readonly archived: boolean;
  readonly takenByAnother: boolean;
  readonly cooldownUntil: Date | null;
  readonly now: Date;
}

export function describeUnavailability(
  { archived, takenByAnother, cooldownUntil, now }: Availability,
  formatDate: (date: Date) => string,
): string | null {
  if (archived) {
    return "This task is archived and no longer accepts proof.";
  }
  if (takenByAnother) {
    return "Someone else has already taken this task.";
  }
  if (cooldownUntil !== null && cooldownUntil > now) {
    return `You can submit proof again on ${formatDate(cooldownUntil)}.`;
  }

  return null;
}
