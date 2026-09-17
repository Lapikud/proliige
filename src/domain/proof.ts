import { completionPolicy, type PolicyRefusal, type Standing } from "./completionPolicy";
import type { TaskPolicy } from "./task";

export type ProofStatus = "pending" | "approved" | "rejected";

export interface PhotoRef {
  readonly objectKey: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface ProofPhoto extends PhotoRef {
  readonly id: string;
  readonly proofId: string;
  readonly uploadedAt: Date;
}

export interface Proof {
  readonly id: string;
  readonly taskId: string;
  readonly userId: string;
  readonly status: ProofStatus;
  readonly rejectionReason: string | null;
  readonly submittedAt: Date;

  readonly reviewedAt: Date | null;
  readonly reviewedBy: string | null;
}

export function isTerminal(status: ProofStatus): boolean {
  return status === "approved";
}

export function reservesEntitlement(status: ProofStatus): boolean {
  return status === "pending" || status === "approved";
}

export interface SubmissionCheck extends Standing {
  readonly policy: TaskPolicy;
  readonly taskArchived: boolean;
  readonly pendingByUser: boolean;
}

export type SubmissionRefusal = "task_archived" | "already_pending" | PolicyRefusal;

export function findRefusal({
  policy,
  taskArchived,
  pendingByUser,
  ...standing
}: SubmissionCheck): SubmissionRefusal | null {
  if (taskArchived) {
    return "task_archived";
  }
  if (pendingByUser) {
    return "already_pending";
  }

  return completionPolicy(policy).refuse(standing);
}

const refusalMessages: Record<SubmissionRefusal, string> = {
  task_archived: "This task is archived and no longer accepts proof.",
  already_pending: "You already have a proof awaiting review for this task.",
  already_taken: "Someone else has already taken this task.",
  already_completed: "You have already completed this task.",
  cooldown_active: "You cannot submit proof for this task again yet.",
};

export function describeRefusal(reason: SubmissionRefusal): string {
  return refusalMessages[reason];
}
export function cooldownExpiresAt(
  lastApprovedAt: Date | null,
  cooldownSeconds: number | null,
): Date | null {
  if (lastApprovedAt === null || !cooldownSeconds) {
    return null;
  }

  return new Date(lastApprovedAt.getTime() + cooldownSeconds * 1000);
}
