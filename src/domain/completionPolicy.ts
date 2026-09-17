import type { TaskPolicy } from "./task";

export interface Standing {
  readonly takenByAnyone: boolean;
  readonly completedByUser: boolean;
  readonly lastApprovedAt: Date | null;
  readonly cooldownSeconds: number | null;
  readonly now: Date;
}

export type PolicyRefusal = "already_taken" | "already_completed" | "cooldown_active";

export interface CompletionPolicy {
  readonly label: string;
  readonly usesCooldown: boolean;
  readonly exclusive: boolean;
  refuse(standing: Standing): PolicyRefusal | null;
}

const singleWinner: CompletionPolicy = {
  label: "first to complete it",
  usesCooldown: false,
  exclusive: true,
  refuse: ({ takenByAnyone }) => (takenByAnyone ? "already_taken" : null),
};

const oncePerUser: CompletionPolicy = {
  label: "once per user",
  usesCooldown: false,
  exclusive: false,
  refuse: ({ completedByUser }) => (completedByUser ? "already_completed" : null),
};

const repeatable: CompletionPolicy = {
  label: "repeatable",
  usesCooldown: true,
  exclusive: false,
  refuse: ({ lastApprovedAt, cooldownSeconds, now }) => {
    if (lastApprovedAt === null || !cooldownSeconds) {
      return null;
    }
    const elapsed = now.getTime() - lastApprovedAt.getTime();

    return elapsed < cooldownSeconds * 1000 ? "cooldown_active" : null;
  },
};

export const completionPolicies: Readonly<Record<TaskPolicy, CompletionPolicy>> = {
  single_winner: singleWinner,
  one_per_user: oncePerUser,
  repeatable,
};

export const completionPolicy = (policy: TaskPolicy): CompletionPolicy =>
  completionPolicies[policy];

export interface ProofSnapshot {
  readonly userId: string;
  readonly status: "pending" | "approved" | "rejected";
  readonly reviewedAt: Date | null;
}

export interface UserStanding extends Omit<Standing, "cooldownSeconds" | "now"> {
  readonly pendingByUser: boolean;
}

export function standingOf(proofs: ReadonlyArray<ProofSnapshot>, userId: string): UserStanding {
  const mine = proofs.filter((proof) => proof.userId === userId);
  const approvedTimes = mine.flatMap((proof) =>
    proof.status === "approved" && proof.reviewedAt ? [proof.reviewedAt.getTime()] : [],
  );

  return {
    takenByAnyone: proofs.some((proof) => proof.status !== "rejected"),
    completedByUser: approvedTimes.length > 0,
    pendingByUser: mine.some((proof) => proof.status === "pending"),
    lastApprovedAt: approvedTimes.length > 0 ? new Date(Math.max(...approvedTimes)) : null,
  };
}
