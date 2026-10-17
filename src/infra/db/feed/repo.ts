import { and, asc, desc, eq, exists, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { FeedRepository } from "~/core/ports/feed";
import { recognitionFilter } from "~/domain/feed";
import { categories } from "../category/model";
import type { Database } from "../client";
import { pointsLedger } from "../points/model";
import { proofPhotos, proofReports, proofs } from "../proof/model";
import { recognitionBadges } from "../recognition/badgeModel";
import { loadEarnedBadges } from "../recognition/earned";
import { recognitions } from "../recognition/model";
import { tasks } from "../task/model";
import { users } from "../user/model";
import { proofComments, proofLikes } from "./model";

export function createFeedRepository(db: Database): FeedRepository {
  return {
    async listFeed({
      cursor,
      limit,
      categoryId,
      authorId,
      includeExcludedAuthor,
      includeHidden,
      viewerId,
    }) {
      const proofConditions = [eq(proofs.status, "approved"), isNotNull(proofs.reviewedAt)];
      if (!includeHidden) {
        proofConditions.push(isNull(proofs.hiddenAt), eq(tasks.showOnFeed, true));
      }
      const reversal = alias(pointsLedger, "reversal");
      if (!includeExcludedAuthor) proofConditions.push(eq(users.excluded, false));
      const onlyRecognitions = categoryId === recognitionFilter;
      if (categoryId && !onlyRecognitions) proofConditions.push(eq(tasks.categoryId, categoryId));
      if (authorId) proofConditions.push(eq(proofs.userId, authorId));
      if (cursor) {
        const cursorCondition = or(
          lt(proofs.reviewedAt, cursor.approvedAt),
          and(eq(proofs.reviewedAt, cursor.approvedAt), lt(proofs.id, cursor.proofId)),
        );
        if (cursorCondition) proofConditions.push(cursorCondition);
      }

      const proofRows = onlyRecognitions
        ? []
        : await db
            .select({
              proofId: proofs.id,
              reviewedAt: proofs.reviewedAt,
              taskTitle: tasks.title,
              textAnswer: proofs.textAnswer,
              textMarkdown: proofs.textMarkdown,
              points: pointsLedger.points,
              taskRemovedAt: tasks.removedAt,
              reversalId: reversal.id,
              hiddenAt: proofs.hiddenAt,
              showOnFeed: tasks.showOnFeed,
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
                        .where(
                          and(eq(proofLikes.proofId, proofs.id), eq(proofLikes.userId, viewerId)),
                        ),
                    ),
                    reportedByUser: exists(
                      db
                        .select({ id: proofReports.id })
                        .from(proofReports)
                        .where(
                          and(
                            eq(proofReports.proofId, proofs.id),
                            eq(proofReports.reporterId, viewerId),
                          ),
                        ),
                    ),
                  }
                : {}),
            })
            .from(proofs)
            .innerJoin(tasks, eq(tasks.id, proofs.taskId))
            .innerJoin(categories, eq(categories.id, tasks.categoryId))
            .innerJoin(users, eq(users.id, proofs.userId))
            .leftJoin(
              pointsLedger,
              and(eq(pointsLedger.proofId, proofs.id), isNull(pointsLedger.reversalOf)),
            )
            .leftJoin(reversal, eq(reversal.reversalOf, pointsLedger.id))
            .where(and(...proofConditions))
            .orderBy(desc(proofs.reviewedAt), desc(proofs.id))
            .limit(limit + 1);

      const recipient = alias(users, "recognition_recipient");
      const reviewer = alias(users, "recognition_reviewer");
      const recognitionConditions = includeExcludedAuthor ? [] : [eq(recipient.excluded, false)];
      if (authorId) recognitionConditions.push(eq(recipient.id, authorId));
      if (cursor) {
        const cursorCondition = or(
          lt(recognitions.createdAt, cursor.approvedAt),
          and(eq(recognitions.createdAt, cursor.approvedAt), lt(recognitions.id, cursor.proofId)),
        );
        if (cursorCondition) recognitionConditions.push(cursorCondition);
      }
      const recognitionRows =
        categoryId && !onlyRecognitions
          ? []
          : await db
              .select({
                id: recognitions.id,
                createdAt: recognitions.createdAt,
                description: recognitions.description,
                descriptionMarkdown: recognitions.descriptionMarkdown,
                points: recognitions.points,
                badges: recognitions.badges,
                links: recognitions.links,
                recipientId: recipient.id,
                recipientName: recipient.displayName,
                reviewerId: reviewer.id,
                reviewerName: reviewer.displayName,
                likeCount: db.$count(proofLikes, eq(proofLikes.recognitionId, recognitions.id)),
                commentCount: db.$count(
                  proofComments,
                  and(
                    eq(proofComments.recognitionId, recognitions.id),
                    isNull(proofComments.deletedAt),
                  ),
                ),
                ...(viewerId
                  ? {
                      likedByUser: exists(
                        db
                          .select({ id: proofLikes.id })
                          .from(proofLikes)
                          .where(
                            and(
                              eq(proofLikes.recognitionId, recognitions.id),
                              eq(proofLikes.userId, viewerId),
                            ),
                          ),
                      ),
                    }
                  : {}),
              })
              .from(recognitions)
              .innerJoin(recipient, eq(recipient.id, recognitions.recipientId))
              .innerJoin(reviewer, eq(reviewer.id, recognitions.reviewerId))
              .where(and(...recognitionConditions))
              .orderBy(desc(recognitions.createdAt), desc(recognitions.id))
              .limit(limit + 1);

      const photosByProof = await loadPhotoIds(
        db,
        proofRows.map(({ proofId }) => proofId),
      );
      const selectedBadgeLabels = [...new Set(recognitionRows.flatMap(({ badges }) => badges))];
      const badgeRows =
        selectedBadgeLabels.length === 0
          ? []
          : await db
              .select({
                id: recognitionBadges.id,
                label: recognitionBadges.label,
                imageUrl: recognitionBadges.imageUrl,
              })
              .from(recognitionBadges)
              .where(inArray(recognitionBadges.label, selectedBadgeLabels));
      const badgesByLabel = new Map(badgeRows.map((badge) => [badge.label, badge]));
      const combined = [
        ...proofRows.flatMap((row) =>
          row.reviewedAt === null
            ? []
            : [
                {
                  kind: "proof" as const,
                  proofId: row.proofId,
                  taskTitle: row.taskTitle,
                  textAnswer: row.textAnswer,
                  textMarkdown: row.textMarkdown,
                  categoryName: row.categoryName,
                  points: row.points ?? 0,
                  taskRemoved: row.taskRemovedAt !== null,
                  pointsReversed: row.reversalId !== null && (row.points ?? 0) > 0,
                  offFeed: offFeed(row),
                  user: {
                    id: row.userId,
                    displayName: row.displayName,
                  },
                  approvedAt: row.reviewedAt,
                  likeCount: row.likeCount,
                  commentCount: row.commentCount,
                  likedByUser: Boolean(row.likedByUser),
                  reportedByUser: "reportedByUser" in row && Boolean(row.reportedByUser),
                  photoIds: photosByProof.get(row.proofId) ?? [],
                },
              ],
        ),
        ...recognitionRows.map((row) => ({
          kind: "recognition" as const,
          proofId: row.id,
          taskTitle: "Contribution recognition",
          textAnswer: null,
          textMarkdown: row.descriptionMarkdown,
          categoryName: "Recognition",
          points: row.points,
          taskRemoved: false,
          pointsReversed: false,
          offFeed: null,
          user: {
            id: row.recipientId,
            displayName: row.recipientName,
          },
          approvedAt: row.createdAt,
          likeCount: row.likeCount,
          commentCount: row.commentCount,
          likedByUser: "likedByUser" in row && Boolean(row.likedByUser),
          reportedByUser: false,
          photoIds: [],
          recognitionDescription: row.description,
          reviewer: {
            id: row.reviewerId,
            displayName: row.reviewerName,
          },
          badges: row.badges.flatMap((label) => {
            const badge = badgesByLabel.get(label);

            return badge ? [badge] : [];
          }),
          achievementLinks: row.links,
        })),
      ].sort(
        (a, b) =>
          b.approvedAt.getTime() - a.approvedAt.getTime() || b.proofId.localeCompare(a.proofId),
      );
      const hasMore = combined.length > limit;
      const earned = await loadEarnedBadges(db, [
        ...new Set(combined.slice(0, limit).map(({ user }) => user.id)),
      ]);
      const page = combined.slice(0, limit).map((entry) => ({
        ...entry,
        authorBadges: earned.get(entry.user.id) ?? [],
      }));
      const last = page.at(-1);

      return {
        entries: page,
        nextCursor:
          hasMore && last
            ? {
                approvedAt: last.approvedAt,
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
  if (proofIds.length === 0) return byProof;
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

function offFeed(row: { hiddenAt: Date | null; showOnFeed: boolean }): "removed" | "task" | null {
  if (row.hiddenAt !== null) return "removed";

  return row.showOnFeed ? null : "task";
}
