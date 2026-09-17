import type { LeaderboardRow } from "~/domain/points";

export interface LeaderboardOptions {
  readonly limit?: number;
  readonly since?: Date | null;
}

export interface LeaderboardRepository {
  leaderboard(options?: LeaderboardOptions): Promise<Array<LeaderboardRow>>;
}
