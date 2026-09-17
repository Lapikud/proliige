import { and, count, eq } from "drizzle-orm";
import type { LikeRepository } from "~/core/ports/like";
import type { Database } from "../client";
import { isUniqueViolation } from "../errors";
import { proofLikes } from "./model";
import { onlyRow } from "../rows";

export function createLikeRepository(db: Database): LikeRepository {
  return {
    async toggleLike({ proofId, userId, now }) {
      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: proofLikes.id })
          .from(proofLikes)
          .where(and(eq(proofLikes.proofId, proofId), eq(proofLikes.userId, userId)))
          .limit(1);

        let liked: boolean;
        if (existing === undefined) {
          try {
            await tx.insert(proofLikes).values({
              proofId,
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
          await tx
            .select({ count: count() })
            .from(proofLikes)
            .where(eq(proofLikes.proofId, proofId)),
        );

        return {
          liked,
          likeCount,
        };
      });
    },
  };
}
