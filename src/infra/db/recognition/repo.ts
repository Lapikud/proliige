import { and, arrayOverlaps, eq, inArray, isNull } from "drizzle-orm";
import type { RecognitionRepository } from "~/core/ports/recognition";
import { conflict, notFound } from "~/domain/errors";
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
  const eligible = and(
    eq(users.excluded, false),
    arrayOverlaps(users.freeipaGroups, [...memberGroups]),
  );

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
          hiddenAt: recognitions.hiddenAt,
          revokedAt: recognitions.revokedAt,
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
          labelKey: label.toLowerCase(),
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

        const selectedBadges = await badgeLabels(tx, badgeIds);

        const [recognition] = await tx
          .insert(recognitions)
          .values({
            recipientId,
            reviewerId,
            description,
            descriptionMarkdown,
            points,
            badges: selectedBadges,
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

    async update({ id, description, descriptionMarkdown = false, badgeIds, links }) {
      await db.transaction(async (tx) => {
        const badges = await badgeLabels(tx, badgeIds);
        const [updated] = await tx
          .update(recognitions)
          .set({
            description,
            descriptionMarkdown,
            badges,
            links: [...links],
          })
          .where(and(eq(recognitions.id, id), isNull(recognitions.revokedAt)))
          .returning({ id: recognitions.id });
        if (!updated) throw notFound("That recognition does not exist or was taken back.");
      });
    },

    async setHidden({ id, hidden, hiddenBy, now }) {
      const [updated] = await db
        .update(recognitions)
        .set(
          hidden
            ? {
                hiddenAt: now,
                hiddenBy,
              }
            : {
                hiddenAt: null,
                hiddenBy: null,
              },
        )
        .where(and(eq(recognitions.id, id), isNull(recognitions.revokedAt)))
        .returning({ id: recognitions.id });
      if (!updated) throw notFound("That recognition does not exist or was taken back.");
    },

    async revoke({ id, revokedBy, now }) {
      return db.transaction(async (tx) => {
        const [revoked] = await tx
          .update(recognitions)
          .set({
            revokedAt: now,
            revokedBy,
          })
          .where(and(eq(recognitions.id, id), isNull(recognitions.revokedAt)))
          .returning({ id: recognitions.id });
        if (!revoked) {
          const [existing] = await tx
            .select({ id: recognitions.id })
            .from(recognitions)
            .where(eq(recognitions.id, id))
            .limit(1);
          if (!existing) throw notFound("That recognition does not exist.");

          return { alreadyRevoked: true };
        }

        const [credit] = await tx
          .select()
          .from(pointsLedger)
          .where(and(eq(pointsLedger.recognitionId, id), isNull(pointsLedger.reversalOf)))
          .limit(1);
        if (credit) {
          await tx
            .insert(pointsLedger)
            .values({
              userId: credit.userId,
              recognitionId: id,
              points: -credit.points,
              awardedAt: credit.awardedAt,
              createdAt: now,
              reversalOf: credit.id,
            })
            .onConflictDoNothing();
        }

        return { alreadyRevoked: false };
      });
    },
  };
}

async function badgeLabels(
  tx: Pick<Database, "select">,
  badgeIds: ReadonlyArray<string>,
): Promise<Array<string>> {
  if (badgeIds.length === 0) return [];
  const rows = await tx
    .select({ label: recognitionBadges.label })
    .from(recognitionBadges)
    .where(inArray(recognitionBadges.id, [...badgeIds]));
  if (rows.length !== badgeIds.length)
    throw conflict("One or more selected badges no longer exist.");

  return rows.map(({ label }) => label);
}
