import { and, eq, inArray, sql } from "drizzle-orm";
import type { RecognitionRepository } from "~/core/ports/recognition";
import { conflict } from "~/domain/errors";
import type { Database } from "../client";
import { pointsLedger } from "../points/model";
import { users } from "../user/model";
import { recognitionBadges } from "./badgeModel";
import { loadEarnedBadges } from "./earned";
import { recognitions } from "./model";

export function createRecognitionRepository(
  db: Database,
  memberGroups: ReadonlyArray<string>,
): RecognitionRepository {
  const allowedGroups = sql`ARRAY[${sql.join(
    memberGroups.map((group) => sql`${group}`),
    sql`, `,
  )}]::text[]`;
  const eligible = and(eq(users.excluded, false), sql`${users.freeipaGroups} && ${allowedGroups}`);

  return {
    async listEligibleRecipients() {
      return db
        .select({
          id: users.id,
          displayName: users.displayName,
        })
        .from(users)
        .where(eligible)
        .orderBy(users.displayName);
    },

    async findById(id) {
      const [row] = await db
        .select({
          id: recognitions.id,
          recipientId: recognitions.recipientId,
        })
        .from(recognitions)
        .where(eq(recognitions.id, id))
        .limit(1);

      return row ?? null;
    },

    async listBadges() {
      return db
        .select({
          id: recognitionBadges.id,
          label: recognitionBadges.label,
          imageUrl: recognitionBadges.imageUrl,
        })
        .from(recognitionBadges)
        .orderBy(recognitionBadges.label);
    },

    async listEarnedBadges(userId) {
      return (await loadEarnedBadges(db, [userId])).get(userId) ?? [];
    },

    async createBadge({ label, imageUrl, createdBy, now }) {
      const [badge] = await db
        .insert(recognitionBadges)
        .values({
          label,
          imageUrl,
          createdBy,
          createdAt: now,
        })
        .onConflictDoNothing()
        .returning({
          id: recognitionBadges.id,
          label: recognitionBadges.label,
          imageUrl: recognitionBadges.imageUrl,
        });
      if (!badge) throw conflict("A badge with that name already exists.");

      return badge;
    },

    async publish({
      recipientId,
      reviewerId,
      description,
      descriptionMarkdown = false,
      points,
      badgeIds,
      links,
      now,
    }) {
      await db.transaction(async (tx) => {
        const [recipient] = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, recipientId), eligible))
          .for("share")
          .limit(1);
        if (!recipient) throw conflict("That member is not eligible to receive recognition.");

        const selectedBadges =
          badgeIds.length === 0
            ? []
            : await tx
                .select({ label: recognitionBadges.label })
                .from(recognitionBadges)
                .where(inArray(recognitionBadges.id, [...badgeIds]));
        if (selectedBadges.length !== badgeIds.length)
          throw conflict("One or more selected badges no longer exist.");

        const [recognition] = await tx
          .insert(recognitions)
          .values({
            recipientId,
            reviewerId,
            description,
            descriptionMarkdown,
            points,
            badges: selectedBadges.map(({ label }) => label),
            links: [...links],
            createdAt: now,
          })
          .returning({ id: recognitions.id });
        if (!recognition) throw new Error("Recognition insert returned no row.");

        await tx.insert(pointsLedger).values({
          userId: recipientId,
          recognitionId: recognition.id,
          points,
          awardedAt: now,
          createdAt: now,
        });
      });
    },
  };
}
