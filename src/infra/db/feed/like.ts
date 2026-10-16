import { and, count, eq } from "drizzle-orm";
import type { LikeRepository } from "~/core/ports/like";
import type { Database } from "../client";
import { isUniqueViolation } from "../errors";
import { proofLikes } from "./model";
import { onlyRow } from "../rows";

export function createLikeRepository(db: Database): LikeRepository {
  return {
    async toggleLike({ post, userId, now }) {
      const target = post.kind === "proof" ? proofLikes.proofId : proofLikes.recognitionId;
      const values = post.kind === "proof" ? { proofId: post.id } : { recognitionId: post.id };

      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: proofLikes.id })
          .from(proofLikes)
          .where(and(eq(target, post.id), eq(proofLikes.userId, userId)))
          .limit(1);

        let liked: boolean;
        if (existing === undefined) {
          try {
            await tx.insert(proofLikes).values({
              ...values,
              userId,
              createdAt: now,
            });
            liked = true;
          } catch (error) {
            if (!isUniqueViolation(error)) {
              throw error;
            }
            liked = true;
          }
        } else {
          await tx.delete(proofLikes).where(eq(proofLikes.id, existing.id));
          liked = false;
        }

        const { count: likeCount } = onlyRow(
          await tx.select({ count: count() }).from(proofLikes).where(eq(target, post.id)),
        );

        return {
          liked,
          likeCount,
        };
      });
    },
  };
}
