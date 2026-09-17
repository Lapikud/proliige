import { userCanViewLeaderboard } from "~/domain/rules";
import { guard } from "../guard";
import type { LeaderboardOptions, LeaderboardRepository } from "../ports/leaderboard";

interface Deps {
  readonly leaderboard: LeaderboardRepository;
}

export function createLeaderboardService({ leaderboard }: Deps) {
  return {
    listLeaderboard: guard(userCanViewLeaderboard, (_user, options: LeaderboardOptions = {}) =>
      leaderboard.leaderboard({
        limit: 100,
        ...options,
      }),
    ),
  };
}

export type LeaderboardService = ReturnType<typeof createLeaderboardService>;
