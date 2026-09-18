import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { FC, ReactNode } from "react";
import { z } from "zod";
import { CompletedTasks } from "~/components/profile/completedTasks";
import { type PointsBar, PointsChart } from "~/components/profile/pointsChart";
import { UserPicker } from "~/components/profile/userPicker";
import { UserAvatar } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import { Page } from "~/components/ui/page";
import type { LeaderboardRow } from "~/domain/points";
import { feedService, leaderboardService, userService } from "~/infra";
import { getUser } from "~/lib/user";
import { formatDate } from "~/lib/utils";

const CHART_SIZE = 8;

async function findProfile(userId: string) {
  if (!z.uuid().safeParse(userId).success) {
    return null;
  }

  return userService.findProfile(await getUser(), userId);
}

export async function generateMetadata({
  params,
}: PageProps<"/users/[userId]">): Promise<Metadata> {
  const profile = await findProfile((await params).userId);

  return { title: profile?.displayName ?? "User" };
}

const UserPage: FC<PageProps<"/users/[userId]">> = async ({ params }) => {
  const { userId } = await params;
  const profile = await findProfile(userId);
  if (profile === null) {
    notFound();
  }

  const viewer = await getUser();
  const [ranking, completed] = await Promise.all([
    leaderboardService.listLeaderboard(viewer, { limit: 1000 }),
    feedService.listFeed(viewer, {
      cursor: null,
      authorId: userId,
    }),
  ]);
  const rank = ranking.findIndex((row) => row.user.id === userId) + 1;
  const standing = ranking[rank - 1];
  const people =
    rank > 0 ? ranking.map((row) => row.user) : [...ranking.map((row) => row.user), profile];

  return (
    <Page
      title={profile.displayName}
      description={`Standing on ${formatDate(new Date())}`}
      actions={
        <UserAvatar name={profile.displayName} className="size-14 text-lg ring-2 ring-foreground" />
      }
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Rank" highlight>
              {rank > 0 ? `#${String(rank)}` : "–"}
              <span className="text-xs font-normal"> of {ranking.length}</span>
            </Stat>
            <Stat label="Points">{standing?.totalPoints ?? 0}</Stat>
            <Stat label="Tasks done">{standing?.approvedProofs ?? 0}</Stat>
          </dl>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <h2 className="text-base font-black">Points compared to others</h2>
              <PointsChart bars={chartBars(ranking, profile.displayName, userId)} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card>
            <CardContent>
              <UserPicker users={people} current={userId} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2">
              <h2 className="text-base font-black">Completed tasks</h2>
              <CompletedTasks entries={completed.entries} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
};

const Stat: FC<{
  label: string;
  highlight?: boolean;
  children: ReactNode;
}> = ({ label, highlight = false, children }) => (
  <div
    className={
      highlight
        ? "flex flex-col gap-1 rounded-2xl border-2 border-foreground bg-primary p-3 shadow-hard"
        : "flex flex-col gap-1 rounded-2xl border border-border bg-card p-3 shadow-card"
    }
  >
    <dt className="text-xs font-bold">{label}</dt>
    <dd className="font-mono text-2xl tabular-nums">{children}</dd>
  </div>
);

function chartBars(
  ranking: ReadonlyArray<LeaderboardRow>,
  name: string,
  userId: string,
): Array<PointsBar> {
  const top = ranking.slice(0, CHART_SIZE);
  const own = ranking.find((row) => row.user.id === userId);
  const shown = top.some((row) => row.user.id === userId)
    ? top
    : [
        ...top,
        own ?? {
          user: {
            id: userId,
            displayName: name,
          },
          totalPoints: 0,
        },
      ];

  return shown.map((row) => ({
    name: row.user.displayName,
    points: row.totalPoints,
    selected: row.user.id === userId,
  }));
}

export default UserPage;
