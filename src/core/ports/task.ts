import type { ProofStatus } from "~/domain/proof";
import type { Task, TaskPolicy } from "~/domain/task";

export interface TaskListItem {
  readonly task: Task;
  readonly categoryName: string;

  readonly userProofStatus: ProofStatus | null;
  readonly userCooldownUntil: Date | null;

  readonly takenByAnother: boolean;
}

export interface TaskRepository {
  listActive(userId: string | null): Promise<Array<TaskListItem>>;
  listAll(): Promise<
    Array<{
      task: Task;
      categoryName: string;
    }>
  >;
  findById(id: string): Promise<Task | null>;
  findDetail(id: string, userId: string | null): Promise<TaskListItem | null>;
  create(input: NewTaskInput): Promise<Task>;
  update(id: string, input: NewTaskInput): Promise<Task>;
  setArchived(id: string, archived: boolean): Promise<Task>;
}

export interface NewTaskInput {
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly points: number;
  readonly policy: TaskPolicy;
  readonly cooldownSeconds: number | null;
  readonly photoRequired: boolean;
  readonly photoInstructions: string | null;
}
