export type TaskPolicy = "single_winner" | "one_per_user" | "repeatable";

export const taskPolicies: ReadonlyArray<TaskPolicy> = [
  "single_winner",
  "one_per_user",
  "repeatable",
];

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly points: number;
  readonly policy: TaskPolicy;

  readonly cooldownSeconds: number | null;

  readonly photoRequired: boolean;

  readonly photoInstructions: string | null;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function isArchived(task: Pick<Task, "archivedAt">): boolean {
  return task.archivedAt !== null;
}
