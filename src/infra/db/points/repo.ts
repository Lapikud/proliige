import { asc, count, desc, eq, gte, sum } from "drizzle-orm";
import type { LeaderboardRepository } from "~/core/ports/leaderboard";
import type { Database } from "../client";
import { users } from "../user/model";
import { pointsLedger } from "./model";

export function createLeaderboardRepository(db: Database): LeaderboardRepository {
  return {
    async leaderboard({ limit = 100, since = null } = {}) {
      const totalPoints = sum(pointsLedger.points).mapWith(Number);
      const rows = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          totalPoints,
          approvedProofs: count(pointsLedger.id),
        })
        .from(pointsLedger)
        .innerJoin(users, eq(users.id, pointsLedger.userId))
        .where(since === null ? undefined : gte(pointsLedger.awardedAt, since))
        .groupBy(users.id, users.displayName)
        .orderBy(desc(totalPoints), asc(users.displayName))
        .limit(limit);

      return rows.map((row) => ({
        user: {
          id: row.id,
          displayName: row.displayName,
        },
        totalPoints: row.totalPoints,
        approvedProofs: row.approvedProofs,
      }));
    },
  };
}
