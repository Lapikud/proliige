import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { env } from "~/env.config";
import { leaderboardService } from "~/infra";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const ranking = await leaderboardService.listLeaderboard(null, { limit: 1000 });

  return [
    {
      url: env.SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    ...ranking.map((row): MetadataRoute.Sitemap[number] => ({
      url: new URL(`/users/${row.user.id}`, env.SITE_URL).href,
      changeFrequency: "weekly",
      priority: 0.5,
    })),
  ];
}
