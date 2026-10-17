import { and, asc, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import type { LeaderboardRepository } from "~/core/ports/leaderboard";
import type { Database } from "../client";
import { proofs } from "../proof/model";
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
          approvedProofs: count(
            sql`case when ${pointsLedger.reversalOf} is null and ${proofs.status} = 'approved' then 1 end`,
          ),
        })
        .from(pointsLedger)
        .innerJoin(users, eq(users.id, pointsLedger.userId))
        .leftJoin(proofs, eq(proofs.id, pointsLedger.proofId))
        .where(
          since === null
            ? eq(users.excluded, false)
            : and(eq(users.excluded, false), gte(pointsLedger.awardedAt, since)),
        )
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
