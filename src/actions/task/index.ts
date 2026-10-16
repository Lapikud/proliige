"use server";

import { taskService } from "~/infra";
import { action } from "~/lib/action";
import {
  archiveTaskSchema,
  createTaskSchema,
  moveTasksSchema,
  removeTaskSchema,
  setTasksArchivedSchema,
  undoMoveTasksSchema,
  updateTaskSchema,
} from "./schema";

const revalidate = ["/admin/tasks", "/tasks"];

export const createTaskAction = action(
  createTaskSchema,
  async (user, { task }) => {
    await taskService.createTask(user, task);
  },
  { revalidate },
);

export const updateTaskAction = action(
  updateTaskSchema,
  async (user, { taskId, task }) => {
    await taskService.updateTask(user, taskId, task);
  },
  { revalidate },
);

export const removeTaskAction = action(
  removeTaskSchema,
  async (user, { taskId }) => {
    await taskService.removeTask(user, taskId);
  },
  { revalidate },
);

export const archiveTaskAction = action(
  archiveTaskSchema,
  async (user, { taskId, archived }) => {
    await taskService.archiveTask(user, taskId, archived);
  },
  { revalidate },
);

export const moveTasksAction = action(
  moveTasksSchema,
  async (user, { taskIds, categoryId }) => taskService.moveTasks(user, taskIds, categoryId),
  { revalidate },
);

export const undoMoveTasksAction = action(
  undoMoveTasksSchema,
  async (user, { moves }) => taskService.undoMoveTasks(user, moves),
  { revalidate },
);

export const setTasksArchivedAction = action(
  setTasksArchivedSchema,
  async (user, { taskIds, archived }) => taskService.setTasksArchived(user, taskIds, archived),
  { revalidate },
);
