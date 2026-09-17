import { and, asc, desc, eq, exists, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { FeedRepository } from "~/core/ports/feed";
import { categories } from "../category/model";
import { proofPhotos, proofs } from "../proof/model";
import type { Database } from "../client";
import { users } from "../user/model";
import { tasks } from "../task/model";
import { proofComments, proofLikes } from "./model";

export function createFeedRepository(db: Database): FeedRepository {
  return {
    async listFeed({ cursor, limit, categoryId, authorId, viewerId }) {
      const conditions = [eq(proofs.status, "approved"), isNotNull(proofs.reviewedAt)];

      if (categoryId) {
        conditions.push(eq(tasks.categoryId, categoryId));
      }
      if (authorId) {
        conditions.push(eq(proofs.userId, authorId));
      }

      if (cursor !== null) {
        const cursorCondition = or(
          lt(proofs.reviewedAt, cursor.approvedAt),
          and(eq(proofs.reviewedAt, cursor.approvedAt), lt(proofs.id, cursor.proofId)),
        );
        if (cursorCondition !== undefined) {
          conditions.push(cursorCondition);
        }
      }

      const rows = await db
        .select({
          proofId: proofs.id,
          reviewedAt: proofs.reviewedAt,
          taskTitle: tasks.title,
          points: tasks.points,
          categoryName: categories.name,
          userId: users.id,
          displayName: users.displayName,
          likeCount: db.$count(proofLikes, eq(proofLikes.proofId, proofs.id)),
          commentCount: db.$count(
            proofComments,
            and(eq(proofComments.proofId, proofs.id), isNull(proofComments.deletedAt)),
          ),
          ...(viewerId
            ? {
                likedByUser: exists(
                  db
                    .select({ id: proofLikes.id })
                    .from(proofLikes)
                    .where(and(eq(proofLikes.proofId, proofs.id), eq(proofLikes.userId, viewerId))),
                ),
              }
            : {}),
        })
        .from(proofs)
        .innerJoin(tasks, eq(tasks.id, proofs.taskId))
        .innerJoin(categories, eq(categories.id, tasks.categoryId))
        .innerJoin(users, eq(users.id, proofs.userId))
        .where(and(...conditions))
        .orderBy(desc(proofs.reviewedAt), desc(proofs.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      const photosByProof = await loadPhotoIds(
        db,
        page.map((r) => r.proofId),
      );

      const last = page.at(-1);

      return {
        entries: page.map((row) => {
          if (row.reviewedAt === null) {
            throw new Error("Approved proof has no review time");
          }

          return {
            proofId: row.proofId,
            taskTitle: row.taskTitle,
            categoryName: row.categoryName,
            points: row.points,
            user: {
              id: row.userId,
              displayName: row.displayName,
            },
            approvedAt: row.reviewedAt,
            likeCount: row.likeCount,
            commentCount: row.commentCount,
            likedByUser: Boolean(row.likedByUser),
            photoIds: photosByProof.get(row.proofId) ?? [],
          };
        }),
        nextCursor:
          hasMore && last !== undefined && last.reviewedAt !== null
            ? {
                approvedAt: last.reviewedAt,
                proofId: last.proofId,
              }
            : null,
      };
    },
  };
}

async function loadPhotoIds(
  db: Database,
  proofIds: Array<string>,
): Promise<Map<string, Array<string>>> {
  const byProof = new Map<string, Array<string>>();
  if (proofIds.length === 0) {
    return byProof;
  }

  const rows = await db
    .select({
      id: proofPhotos.id,
      proofId: proofPhotos.proofId,
    })
    .from(proofPhotos)
    .where(inArray(proofPhotos.proofId, proofIds))
    .orderBy(asc(proofPhotos.uploadedAt));

  for (const row of rows) {
    const list = byProof.get(row.proofId) ?? [];
    list.push(row.id);
    byProof.set(row.proofId, list);
  }

  return byProof;
}
