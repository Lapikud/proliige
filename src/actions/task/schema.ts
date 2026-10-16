import { z } from "zod";
import type { TaskInput } from "~/core/services/task";
import { taskPolicies } from "~/domain/task";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "A task needs a title.").max(120),
  description: z.string().trim().max(2000),
  categoryId: z.string().min(1, "Pick a category."),
  points: z.number("Enter a number.").int().min(0, "Points cannot be negative."),
  policy: z.enum(taskPolicies),
  cooldownSeconds: z
    .number("Enter a duration like 2m or 1d 4h.")
    .int()
    .min(0, "Cooldown cannot be negative."),
  photoRequired: z.boolean(),
  photoInstructions: z.string().trim().max(200),
  textRequired: z.boolean(),
}) satisfies z.ZodType<TaskInput>;

export const createTaskSchema = z.object({ task: taskSchema });

export const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  task: taskSchema,
});

export const archiveTaskSchema = z.object({
  taskId: z.string().min(1),
  archived: z.boolean(),
});

const taskIdsSchema = z
  .array(z.uuid())
  .min(1, "Select one or more tasks.")
  .refine((ids) => new Set(ids).size === ids.length, "Select each task only once.");

export const moveTasksSchema = z.object({
  taskIds: taskIdsSchema,
  categoryId: z.uuid(),
});

export const setTasksArchivedSchema = z.object({
  taskIds: taskIdsSchema,
  archived: z.boolean(),
});

export const undoMoveTasksSchema = z.object({
  moves: z
    .array(
      z.object({
        taskId: z.uuid(),
        fromCategoryId: z.uuid(),
        toCategoryId: z.uuid(),
      }),
    )
    .min(1)
    .refine((moves) => new Set(moves.map(({ taskId }) => taskId)).size === moves.length),
});

export type TaskValues = z.infer<typeof taskSchema>;
