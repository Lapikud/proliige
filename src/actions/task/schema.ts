import { z } from "zod";
import type { TaskInput } from "~/core/services/task";
import { taskPolicies } from "~/domain/task";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "A task needs a title.").max(120),
  description: z.string().trim().max(2000),
  categoryId: z.string().min(1, "Pick a category."),
  points: z.number("Enter a number.").int().min(0, "Points cannot be negative."),
  policy: z.enum(taskPolicies),
  cooldownSeconds: z.number("Enter a number.").int().min(0, "Cooldown cannot be negative."),
  photoRequired: z.boolean(),
  photoInstructions: z.string().trim().max(200),
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

export type TaskValues = z.infer<typeof taskSchema>;
