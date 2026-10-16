import { completionPolicy } from "~/domain/completionPolicy";
import type { ClockPort } from "../ports/clock";
import type { TaskPolicy } from "~/domain/task";
import { userCanBrowseTasks, userCanManageTasks, userCanSuggestTasks } from "~/domain/rules";
import { guard } from "../guard";
import type { NewTaskInput, TaskMove, TaskRepository } from "../ports/task";

export interface TaskInput {
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly points: number;
  readonly policy: TaskPolicy;
  readonly cooldownSeconds: number;
  readonly photoRequired: boolean;
  readonly photoInstructions: string;
  readonly textRequired: boolean;
}

interface Deps {
  readonly tasks: TaskRepository;
  readonly clock: ClockPort;
}

export function createTaskService({ tasks, clock }: Deps) {
  return {
    listOpenTasks: guard(userCanBrowseTasks, (user) => tasks.listActive(user.id)),

    getTask: guard(userCanBrowseTasks, (user, taskId: string) => tasks.findDetail(taskId, user.id)),

    listAllTasks: guard(userCanManageTasks, () => tasks.listAll()),

    createTask: guard(userCanManageTasks, (_user, input: TaskInput) =>
      tasks.create(toNewTask(input)),
    ),

    updateTask: guard(userCanManageTasks, (_user, taskId: string, input: TaskInput) =>
      tasks.update(taskId, toNewTask(input)),
    ),

    archiveTask: guard(userCanManageTasks, (_user, taskId: string, archived: boolean) =>
      tasks.setArchived(taskId, archived),
    ),

    suggestTask: guard(userCanSuggestTasks, (user, input: TaskInput) =>
      tasks.create({
        ...toNewTask(input),
        suggestedBy: user.id,
        suggestionPending: true,
      }),
    ),

    publishSuggestion: guard(userCanManageTasks, (_user, taskId: string) =>
      tasks.publishSuggestion(taskId),
    ),

    declineSuggestion: guard(userCanManageTasks, (_user, taskId: string) =>
      tasks.declineSuggestion(taskId),
    ),

    removeTask: guard(userCanManageTasks, (user, taskId: string) =>
      tasks.removeWithHistory({
        taskId,
        removedBy: user.id,
        now: clock.now(),
      }),
    ),

    moveTasks: guard(
      userCanManageTasks,
      (_user, taskIds: ReadonlyArray<string>, categoryId: string) =>
        tasks.moveMany(taskIds, categoryId),
    ),

    undoMoveTasks: guard(userCanManageTasks, (_user, moves: ReadonlyArray<TaskMove>) =>
      tasks.undoMoveMany(moves),
    ),

    setTasksArchived: guard(
      userCanManageTasks,
      (_user, taskIds: ReadonlyArray<string>, archived: boolean) =>
        tasks.setArchivedMany(taskIds, archived),
    ),
  };
}

function toNewTask(input: TaskInput): NewTaskInput {
  const { usesCooldown } = completionPolicy(input.policy);
  const hasInstructions = input.photoRequired && input.photoInstructions.length > 0;

  return {
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    points: input.points,
    policy: input.policy,
    photoRequired: input.photoRequired,
    cooldownSeconds: usesCooldown ? input.cooldownSeconds : null,
    photoInstructions: hasInstructions ? input.photoInstructions : null,
    textRequired: input.textRequired,
  };
}

export type TaskService = ReturnType<typeof createTaskService>;
