import { leaderboardService } from "~/infra";
import { getUser } from "~/lib/user";
import { route } from "~/lib/http";

export const GET = route(async () =>
  Response.json({ rows: await leaderboardService.listLeaderboard(await getUser()) }),
);
