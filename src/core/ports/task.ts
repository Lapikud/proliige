import type { ProofStatus } from "~/domain/proof";
import type { Task, TaskPolicy } from "~/domain/task";

export interface TaskListItem {
  readonly task: Task;
  readonly categoryName: string;

  readonly userProofStatus: ProofStatus | null;
  readonly userCooldownUntil: Date | null;

  readonly takenByAnother: boolean;
}

export interface TaskMove {
  readonly taskId: string;
  readonly fromCategoryId: string;
  readonly toCategoryId: string;
}

export interface TaskRepository {
  listActive(userId: string | null): Promise<Array<TaskListItem>>;
  listAll(): Promise<
    Array<{
      task: Task;
      categoryName: string;
      suggestedByName: string | null;
    }>
  >;
  findById(id: string): Promise<Task | null>;
  findDetail(id: string, userId: string | null): Promise<TaskListItem | null>;
  create(input: NewTaskInput): Promise<Task>;
  update(id: string, input: NewTaskInput): Promise<Task>;
  setArchived(id: string, archived: boolean): Promise<Task>;
  removeWithHistory(input: { taskId: string; removedBy: string; now: Date }): Promise<void>;
  remove(id: string): Promise<void>;
  publishSuggestion(id: string): Promise<void>;
  declineSuggestion(id: string): Promise<void>;
  moveMany(ids: ReadonlyArray<string>, categoryId: string): Promise<Array<TaskMove>>;
  undoMoveMany(moves: ReadonlyArray<TaskMove>): Promise<void>;
  setArchivedMany(ids: ReadonlyArray<string>, archived: boolean): Promise<Array<string>>;
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
  readonly textRequired: boolean;
  readonly showOnFeed?: boolean;
  readonly createdBy?: string | null;
  readonly suggestedBy?: string | null;
  readonly suggestionPending?: boolean;
}
