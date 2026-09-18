"use server";

import { taskService } from "~/infra";
import { action } from "~/lib/action";
import { archiveTaskSchema, createTaskSchema, updateTaskSchema } from "./schema";

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

export const archiveTaskAction = action(
  archiveTaskSchema,
  async (user, { taskId, archived }) => {
    await taskService.archiveTask(user, taskId, archived);
  },
  { revalidate },
);
