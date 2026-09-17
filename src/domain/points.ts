import type { PublicUserView } from "./user";

export interface PointsLedgerEntry {
  readonly id: string;
  readonly userId: string;
  readonly proofId: string;
  readonly points: number;
  readonly awardedAt: Date;
}

export interface LeaderboardRow {
  readonly user: PublicUserView;
  readonly totalPoints: number;
  readonly approvedProofs: number;
}

export function compareLeaderboardRows(a: LeaderboardRow, b: LeaderboardRow): number {
  if (a.totalPoints !== b.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }

  return a.user.displayName.localeCompare(b.user.displayName);
}
