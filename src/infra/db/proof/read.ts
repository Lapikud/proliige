import { asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ProofRepository, ProofWithContext } from "~/core/ports/proof";
import { standingOf } from "~/domain/completionPolicy";
import { notFound } from "~/domain/errors";
import type { PublicUserView } from "~/domain/user";
import { categories } from "../category/model";
import type { Database } from "../client";
import { users } from "../user/model";
import { tasks } from "../task/model";
import { proofPhotos, proofReviewRequests, proofs } from "./model";
import { toProof, toPhoto, type ProofRow } from "./map";

export function createProofRead(
  db: Database,
): Pick<
  ProofRepository,
  | "getStanding"
  | "findById"
  | "findWithContext"
  | "listPending"
  | "listReviewed"
  | "listForUser"
  | "listPhotos"
> {
  return {
    async getStanding({ taskId, userId }) {
      const [task] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      const snapshots = await db
        .select({
          userId: proofs.userId,
          status: proofs.status,
          reviewedAt: proofs.reviewedAt,
        })
        .from(proofs)
        .where(eq(proofs.taskId, taskId));

      if (!task) {
        throw notFound("That task does not exist.");
      }

      return standingOf(snapshots, userId);
    },

    async findById(id) {
      const [row] = await db.select().from(proofs).where(eq(proofs.id, id)).limit(1);

      return row === undefined ? null : toProof(row);
    },

    async findWithContext(id) {
      const rows = await selectWithContext(db).where(eq(proofs.id, id)).limit(1);
      if (rows.length === 0) {
        return null;
      }
      const [withPhotos] = await attachDetails(db, rows);

      return withPhotos ?? null;
    },

    async listPending() {
      const rows = await selectWithContext(db)
        .where(eq(proofs.status, "pending"))
        .orderBy(desc(proofs.submittedAt));

      return attachDetails(db, rows);
    },

    async listReviewed(limit = 100) {
      const rows = await selectWithContext(db)
        .where(inArray(proofs.status, ["approved", "rejected"]))
        .orderBy(desc(proofs.reviewedAt))
        .limit(limit);

      return attachDetails(db, rows);
    },

    async listForUser(userId) {
      const rows = await selectWithContext(db)
        .where(eq(proofs.userId, userId))
        .orderBy(desc(proofs.submittedAt));

      return attachDetails(db, rows);
    },

    async listPhotos(proofId) {
      const rows = await db.select().from(proofPhotos).where(eq(proofPhotos.proofId, proofId));

      return rows.map(toPhoto);
    },
  };
}

const reviewer = alias(users, "reviewer");

function selectWithContext(db: Database) {
  return db
    .select({
      proof: proofs,
      taskTitle: tasks.title,
      taskPoints: tasks.points,
      categoryName: categories.name,
      userDisplayName: users.displayName,
      reviewedByName: reviewer.displayName,
    })
    .from(proofs)
    .innerJoin(tasks, eq(tasks.id, proofs.taskId))
    .innerJoin(categories, eq(categories.id, tasks.categoryId))
    .innerJoin(users, eq(users.id, proofs.userId))
    .leftJoin(reviewer, eq(reviewer.id, proofs.reviewedBy));
}

interface ContextRow {
  proof: ProofRow;
  taskTitle: string;
  taskPoints: number;
  categoryName: string;
  userDisplayName: string;
  reviewedByName: string | null;
}

async function attachDetails(
  db: Database,
  rows: Array<ContextRow>,
): Promise<Array<ProofWithContext>> {
  if (rows.length === 0) {
    return [];
  }
  const ids = rows.map((r) => r.proof.id);
  const photoRows = await db.select().from(proofPhotos).where(inArray(proofPhotos.proofId, ids));

  const requestRows = await db
    .select({
      proofId: proofReviewRequests.proofId,
      id: users.id,
      displayName: users.displayName,
    })
    .from(proofReviewRequests)
    .innerJoin(users, eq(users.id, proofReviewRequests.reviewerId))
    .where(inArray(proofReviewRequests.proofId, ids))
    .orderBy(asc(users.displayName));

  const byProof = groupBy(photoRows.map((row) => [row.proofId, toPhoto(row)] as const));
  const reviewersByProof = groupBy<PublicUserView>(
    requestRows.map(
      ({ proofId, id, displayName }) =>
        [
          proofId,
          {
            id,
            displayName,
          },
        ] as const,
    ),
  );

  return rows.map((row) => ({
    proof: toProof(row.proof),
    taskTitle: row.taskTitle,
    taskPoints: row.taskPoints,
    categoryName: row.categoryName,
    userDisplayName: row.userDisplayName,
    photos: byProof.get(row.proof.id) ?? [],
    requestedReviewers: reviewersByProof.get(row.proof.id) ?? [],
    reviewedByName: row.reviewedByName,
  }));
}

function groupBy<T>(pairs: ReadonlyArray<readonly [string, T]>): Map<string, Array<T>> {
  const grouped = new Map<string, Array<T>>();
  for (const [key, value] of pairs) {
    const list = grouped.get(key) ?? [];
    list.push(value);
    grouped.set(key, list);
  }

  return grouped;
}
