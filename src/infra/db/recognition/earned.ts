import { asc, inArray } from "drizzle-orm";
import type { EarnedBadge } from "~/domain/feed";
import type { Database } from "../client";
import { recognitionBadges } from "./badgeModel";
import { recognitions } from "./model";

export async function loadEarnedBadges(
  db: Database,
  userIds: ReadonlyArray<string>,
): Promise<Map<string, Array<EarnedBadge>>> {
  const byUser = new Map<string, Array<EarnedBadge>>();
  if (userIds.length === 0) return byUser;

  const rows = await db
    .select({
      recipientId: recognitions.recipientId,
      badges: recognitions.badges,
    })
    .from(recognitions)
    .where(inArray(recognitions.recipientId, [...userIds]))
    .orderBy(asc(recognitions.createdAt));
  const labels = [...new Set(rows.flatMap(({ badges }) => badges))];
  if (labels.length === 0) return byUser;

  const catalog = await db
    .select({
      id: recognitionBadges.id,
      label: recognitionBadges.label,
      imageUrl: recognitionBadges.imageUrl,
    })
    .from(recognitionBadges)
    .where(inArray(recognitionBadges.label, labels));
  const byLabel = new Map(catalog.map((badge) => [badge.label, badge]));

  for (const { recipientId, badges } of rows) {
    const earned = byUser.get(recipientId) ?? [];
    for (const label of badges) {
      const badge = byLabel.get(label);
      if (badge && !earned.some(({ id }) => id === badge.id)) earned.push(badge);
    }
    byUser.set(recipientId, earned);
  }

  return byUser;
}
