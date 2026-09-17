import { asc, eq, inArray, isNull } from "drizzle-orm";
import type { TaskListItem, TaskRepository } from "~/core/ports/task";
import {
  completionPolicy,
  type UserStanding,
  type ProofSnapshot,
  standingOf,
} from "~/domain/completionPolicy";
import { cooldownExpiresAt, type ProofStatus } from "~/domain/proof";
import type { Task } from "~/domain/task";
import { categories } from "../category/model";
import { proofs } from "../proof/model";
import type { Database } from "../client";
import { tasks } from "./model";
import { toTask } from "./map";

export function createTaskRead(
  db: Database,
): Pick<TaskRepository, "listActive" | "listAll" | "findById" | "findDetail"> {
  return {
    async listActive(userId) {
      const rows = await db
        .select({
          task: tasks,
          categoryName: categories.name,
        })
        .from(tasks)
        .innerJoin(categories, eq(categories.id, tasks.categoryId))
        .where(isNull(tasks.archivedAt))
        .orderBy(asc(categories.name), asc(tasks.title));

      if (rows.length === 0) {
        return [];
      }

      const taskIds = rows.map(({ task }) => task.id);
      const proofRows = await db
        .select({
          taskId: proofs.taskId,
          status: proofs.status,
          userId: proofs.userId,
          reviewedAt: proofs.reviewedAt,
        })
        .from(proofs)
        .where(inArray(proofs.taskId, taskIds));

      const proofsByTask = new Map<string, typeof proofRows>();
      for (const row of proofRows) {
        const taskProofs = proofsByTask.get(row.taskId) ?? [];
        taskProofs.push(row);
        proofsByTask.set(row.taskId, taskProofs);
      }

      return rows.map((row) =>
        buildListItemFromFacts(
          toTask(row.task),
          row.categoryName,
          userId,
          proofsByTask.get(row.task.id) ?? [],
        ),
      );
    },

    async listAll() {
      const rows = await db
        .select({
          task: tasks,
          categoryName: categories.name,
        })
        .from(tasks)
        .innerJoin(categories, eq(categories.id, tasks.categoryId))
        .orderBy(asc(categories.name), asc(tasks.title));

      return rows.map((row) => ({
        task: toTask(row.task),
        categoryName: row.categoryName,
      }));
    },

    async findById(id) {
      const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

      return row === undefined ? null : toTask(row);
    },

    async findDetail(id, userId) {
      const [row] = await db
        .select({
          task: tasks,
          categoryName: categories.name,
        })
        .from(tasks)
        .innerJoin(categories, eq(categories.id, tasks.categoryId))
        .where(eq(tasks.id, id))
        .limit(1);
      if (row === undefined) {
        return null;
      }

      return buildListItem(db, toTask(row.task), row.categoryName, userId);
    },
  };
}

function buildListItemFromFacts(
  task: Task,
  categoryName: string,
  userId: string | null,
  rows: ReadonlyArray<ProofSnapshot>,
): TaskListItem {
  const policy = completionPolicy(task.policy);
  const others = rows.filter((row) => row.userId !== userId);
  const standing = standingOf(rows, userId ?? "");

  return {
    task,
    categoryName,
    userProofStatus: userStatus(standing),
    userCooldownUntil: policy.usesCooldown
      ? cooldownExpiresAt(standing.lastApprovedAt, task.cooldownSeconds)
      : null,
    takenByAnother: policy.exclusive && others.some((row) => row.status !== "rejected"),
  };
}

function userStatus({ pendingByUser, completedByUser }: UserStanding): ProofStatus | null {
  if (pendingByUser) {
    return "pending";
  }
  if (completedByUser) {
    return "approved";
  }

  return null;
}

async function buildListItem(
  db: Database,
  task: Task,
  categoryName: string,
  userId: string | null,
): Promise<TaskListItem> {
  const rows = await db
    .select({
      status: proofs.status,
      userId: proofs.userId,
      reviewedAt: proofs.reviewedAt,
    })
    .from(proofs)
    .where(eq(proofs.taskId, task.id));

  return buildListItemFromFacts(task, categoryName, userId, rows);
}
