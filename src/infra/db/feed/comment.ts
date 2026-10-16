import { and, asc, eq, gte } from "drizzle-orm";
import type { CommentRepository } from "~/core/ports/comment";
import { DELETED_COMMENT_PLACEHOLDER, type FeedComment } from "~/domain/feed";
import type { Database } from "../client";
import { users } from "../user/model";
import { proofComments } from "./model";
import { onlyRow } from "../rows";

export function createCommentRepository(db: Database): CommentRepository {
  return {
    async listComments(post) {
      const target =
        post.kind === "proof" ? proofComments.proofId : proofComments.recognitionId;
      const rows = await db
        .select({
          id: proofComments.id,
          body: proofComments.body,
          createdAt: proofComments.createdAt,
          deletedAt: proofComments.deletedAt,
          userId: users.id,
          displayName: users.displayName,
        })
        .from(proofComments)
        .innerJoin(users, eq(users.id, proofComments.userId))
        .where(eq(target, post.id))
        .orderBy(asc(proofComments.createdAt));

      return rows.map((row): FeedComment => ({
        id: row.id,
        proofId: post.id,
        author: {
          id: row.userId,
          displayName: row.displayName,
        },

        body: row.deletedAt === null ? row.body : DELETED_COMMENT_PLACEHOLDER,
        createdAt: row.createdAt,
        deletedAt: row.deletedAt,
      }));
    },

    async addComment({ post, userId, body, now }) {
      const row = onlyRow(
        await db
          .insert(proofComments)
          .values({
            ...(post.kind === "proof" ? { proofId: post.id } : { recognitionId: post.id }),
            userId,
            body,
            createdAt: now,
          })
          .returning(),
      );

      const author = onlyRow(
        await db
          .select({
            id: users.id,
            displayName: users.displayName,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
      );

      return {
        id: row.id,
        proofId: post.id,
        author: {
          id: author.id,
          displayName: author.displayName,
        },
        body: row.body,
        createdAt: row.createdAt,
        deletedAt: null,
      };
    },

    async recentCommentTimes(userId, since) {
      const rows = await db
        .select({ createdAt: proofComments.createdAt })
        .from(proofComments)
        .where(and(eq(proofComments.userId, userId), gte(proofComments.createdAt, since)));

      return rows.map((r) => r.createdAt);
    },

    async findComment(id) {
      const [row] = await db
        .select({
          id: proofComments.id,
          proofId: proofComments.proofId,
          recognitionId: proofComments.recognitionId,
          userId: proofComments.userId,
          body: proofComments.body,
          createdAt: proofComments.createdAt,
          deletedAt: proofComments.deletedAt,
          displayName: users.displayName,
        })
        .from(proofComments)
        .innerJoin(users, eq(users.id, proofComments.userId))
        .where(eq(proofComments.id, id))
        .limit(1);

      if (row === undefined) {
        return null;
      }
      const comment: FeedComment & { userId: string } = {
        id: row.id,
        proofId: row.proofId ?? row.recognitionId ?? "",
        userId: row.userId,
        author: {
          id: row.userId,
          displayName: row.displayName,
        },
        body: row.deletedAt === null ? row.body : DELETED_COMMENT_PLACEHOLDER,
        createdAt: row.createdAt,
        deletedAt: row.deletedAt,
      };

      return comment;
    },

    async softDeleteComment(id, now) {
      await db
        .update(proofComments)
        .set({
          deletedAt: now,
          body: "",
        })
        .where(eq(proofComments.id, id));
    },
  };
}
