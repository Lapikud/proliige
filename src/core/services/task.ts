import { completionPolicy } from "~/domain/completionPolicy";
import type { TaskPolicy } from "~/domain/task";
import { userCanBrowseTasks, userCanManageTasks } from "~/domain/rules";
import { guard } from "../guard";
import type { NewTaskInput, TaskRepository } from "../ports/task";

export interface TaskInput {
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly points: number;
  readonly policy: TaskPolicy;
  readonly cooldownSeconds: number;
  readonly photoRequired: boolean;
  readonly photoInstructions: string;
}

interface Deps {
  readonly tasks: TaskRepository;
}

export function createTaskService({ tasks }: Deps) {
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
  };
}

export type TaskService = ReturnType<typeof createTaskService>;
