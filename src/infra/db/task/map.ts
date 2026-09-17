import type { Task } from "~/domain/task";
import type { tasks } from "./model";

export type TaskRow = typeof tasks.$inferSelect;

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    points: row.points,
    policy: row.policy,
    cooldownSeconds: row.cooldownSeconds,
    photoRequired: row.photoRequired,
    photoInstructions: row.photoInstructions,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
