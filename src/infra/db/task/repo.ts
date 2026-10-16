import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { TaskRepository } from "~/core/ports/task";
import { conflict, notFound } from "~/domain/errors";
import { proofs } from "../proof/model";
import { pointsLedger } from "../points/model";
import { categories } from "../category/model";
import type { Database } from "../client";
import { isForeignKeyViolation, isUniqueViolation } from "../errors";
import { tasks } from "./model";
import { toTask } from "./map";
import { createTaskRead } from "./read";
import { onlyRow } from "../rows";

export function createTaskRepository(db: Database): TaskRepository {
  return {
    ...createTaskRead(db),
    async create(input) {
      const row = onlyRow(await db.insert(tasks).values(input).returning());

      return toTask(row);
    },

    async update(id, input) {
      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(tasks)
          .where(eq(tasks.id, id))
          .limit(1)
          .for("update");
        if (existing === undefined) {
          throw notFound("That task does not exist.");
        }
        if (existing.removedAt !== null) throw conflict("Removed tasks cannot be changed.");

        const row = onlyRow(
          await tx
            .update(tasks)
            .set({
              ...input,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, id))
            .returning(),
        );

        if (existing.policy !== input.policy) {
          try {
            await tx.update(proofs).set({ policy: input.policy }).where(eq(proofs.taskId, id));
          } catch (error) {
            if (isUniqueViolation(error)) {
              throw conflict(
                "Existing proofs on this task conflict with the new completion policy. " +
                  "Resolve those proofs before changing it.",
              );
            }
            throw error;
          }
        }

        return toTask(row);
      });
    },

    async removeWithHistory({ taskId, removedBy, now }) {
      await db.transaction(async (tx) => {
        const [task] = await tx
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .limit(1)
          .for("update");
        if (task === undefined) throw notFound("That task does not exist.");
        if (task.removedAt !== null) return;

        await tx
          .update(proofs)
          .set({
            status: "rejected",
            rejectionReason: "Task removed",
            reviewedBy: removedBy,
            reviewedAt: now,
          })
          .where(and(eq(proofs.taskId, taskId), eq(proofs.status, "pending")));

        const credits = await tx
          .select({
            id: pointsLedger.id,
            userId: pointsLedger.userId,
            proofId: pointsLedger.proofId,
            points: pointsLedger.points,
            awardedAt: pointsLedger.awardedAt,
          })
          .from(pointsLedger)
          .innerJoin(proofs, eq(pointsLedger.proofId, proofs.id))
          .where(and(eq(proofs.taskId, taskId), isNull(pointsLedger.reversalOf)));
        if (credits.length > 0) {
          await tx
            .insert(pointsLedger)
            .values(
              credits.map((credit) => ({
                userId: credit.userId,
                proofId: credit.proofId,
                points: -credit.points,
                awardedAt: credit.awardedAt,
                createdAt: now,
                reversalOf: credit.id,
              })),
            )
            .onConflictDoNothing();
        }

        await tx
          .update(tasks)
          .set({
            removedAt: now,
            removedBy,
            updatedAt: now,
          })
          .where(eq(tasks.id, taskId));
      });
    },

    async remove(id) {
      await db.delete(tasks).where(eq(tasks.id, id));
    },

    async publishSuggestion(id) {
      const rows = await db
        .update(tasks)
        .set({
          suggestionPending: false,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, id), eq(tasks.suggestionPending, true)))
        .returning({ id: tasks.id });
      if (rows.length === 0) throw notFound("That suggestion does not exist.");
    },

    async declineSuggestion(id) {
      const rows = await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.suggestionPending, true)))
        .returning({ id: tasks.id });
      if (rows.length === 0) throw notFound("That suggestion does not exist.");
    },

    async setArchived(id, archived) {
      const [row] = await db
        .update(tasks)
        .set({
          archivedAt: archived ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, id), isNull(tasks.removedAt)))
        .returning();
      if (row === undefined) {
        const existing = await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(eq(tasks.id, id))
          .limit(1);
        if (existing.length === 0) throw notFound("That task does not exist.");
        throw conflict("Removed tasks cannot be changed.");
      }

      return toTask(row);
    },

    async moveMany(ids, categoryId) {
      return db.transaction(async (tx) => {
        const [category] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, categoryId))
          .limit(1);
        if (category === undefined) {
          throw notFound("That category does not exist.");
        }

        const existing = await tx
          .select({
            id: tasks.id,
            categoryId: tasks.categoryId,
            removedAt: tasks.removedAt,
          })
          .from(tasks)
          .where(inArray(tasks.id, ids))
          .orderBy(tasks.id)
          .for("update");
        if (existing.length !== ids.length) {
          throw notFound("One or more selected tasks do not exist.");
        }
        if (existing.some((task) => task.removedAt !== null))
          throw conflict("Removed tasks cannot be moved.");

        const existingById = new Map(existing.map((task) => [task.id, task]));
        const moves = ids.flatMap((id) => {
          const task = existingById.get(id);
          if (task === undefined || task.categoryId === categoryId) return [];

          return [
            {
              taskId: task.id,
              fromCategoryId: task.categoryId,
              toCategoryId: categoryId,
            },
          ];
        });
        if (moves.length > 0) {
          await tx
            .update(tasks)
            .set({
              categoryId,
              updatedAt: new Date(),
            })
            .where(
              inArray(
                tasks.id,
                moves.map(({ taskId }) => taskId),
              ),
            );
        }

        return moves;
      });
    },

    async undoMoveMany(moves) {
      await db.transaction(async (tx) => {
        const ids = moves.map(({ taskId }) => taskId);
        const existing = await tx
          .select({
            id: tasks.id,
            categoryId: tasks.categoryId,
            removedAt: tasks.removedAt,
          })
          .from(tasks)
          .where(inArray(tasks.id, ids))
          .orderBy(tasks.id)
          .for("update");
        if (existing.length !== moves.length) {
          throw notFound("One or more moved tasks no longer exist; no changes were made.");
        }
        if (existing.some((task) => task.removedAt !== null))
          throw conflict("Removed tasks cannot be changed.");

        const currentCategories = new Map(existing.map(({ id, categoryId }) => [id, categoryId]));
        if (
          moves.some(({ taskId, toCategoryId }) => currentCategories.get(taskId) !== toCategoryId)
        ) {
          throw conflict(
            "Some tasks have changed categories since the move; no changes were made.",
          );
        }

        const fromCategoryIds = new Set(moves.map(({ fromCategoryId }) => fromCategoryId));
        try {
          await Promise.all(
            [...fromCategoryIds].map((fromCategoryId) =>
              tx
                .update(tasks)
                .set({
                  categoryId: fromCategoryId,
                  updatedAt: new Date(),
                })
                .where(
                  inArray(
                    tasks.id,
                    moves
                      .filter((move) => move.fromCategoryId === fromCategoryId)
                      .map(({ taskId }) => taskId),
                  ),
                ),
            ),
          );
        } catch (error) {
          if (isForeignKeyViolation(error)) {
            throw conflict("The original category no longer exists; no changes were made.");
          }
          throw error;
        }
      });
    },

    async setArchivedMany(ids, archived) {
      return db.transaction(async (tx) => {
        const existing = await tx
          .select({
            id: tasks.id,
            removedAt: tasks.removedAt,
          })
          .from(tasks)
          .where(inArray(tasks.id, ids))
          .for("update");
        if (existing.length !== ids.length) {
          throw notFound("One or more selected tasks do not exist.");
        }
        if (existing.some((task) => task.removedAt !== null))
          throw conflict("Removed tasks cannot be changed.");

        const rows = await tx
          .update(tasks)
          .set({
            archivedAt: archived ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(tasks.id, ids),
              archived ? isNull(tasks.archivedAt) : isNotNull(tasks.archivedAt),
            ),
          )
          .returning({ id: tasks.id });

        return rows.map(({ id }) => id);
      });
    },
  };
}
