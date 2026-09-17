import { eq } from "drizzle-orm";
import type { TaskRepository } from "~/core/ports/task";
import { conflict, notFound } from "~/domain/errors";
import { proofs } from "../proof/model";
import type { Database } from "../client";
import { isUniqueViolation } from "../errors";
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
        const [existing] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1);
        if (existing === undefined) {
          throw notFound("That task does not exist.");
        }

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

    async setArchived(id, archived) {
      const [row] = await db
        .update(tasks)
        .set({
          archivedAt: archived ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();
      if (row === undefined) {
        throw notFound("That task does not exist.");
      }

      return toTask(row);
    },
  };
}
