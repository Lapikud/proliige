import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { FC, ReactNode } from "react";
import { z } from "zod";
import { SignOutButton } from "~/components/auth/signOutButton";
import { EarnedBadges } from "~/components/badges/earnedBadges";
import { DesktopNotifications } from "~/components/notifications/desktop";
import { CompletedTasks } from "~/components/profile/completedTasks";
import { ExclusionControl } from "~/components/profile/exclusionControl";
import { type PointsBar, PointsChart } from "~/components/profile/pointsChart";
import { UserPicker } from "~/components/profile/userPicker";
import { UserAvatar } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import { Page } from "~/components/ui/page";
import { env } from "~/env.config";
import type { LeaderboardRow } from "~/domain/points";
import { feedService, leaderboardService, recognitionService, userService } from "~/infra";
import { getUser } from "~/lib/user";
import { formatDate } from "~/lib/utils";

const CHART_SIZE = 8;

async function findProfile(userId: string) {
  if (!z.uuid().safeParse(userId).success) {
    return null;
  }

  return userService.findProfile(await getUser(), userId, { includeExcluded: true });
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
  const [ranking, completed, badges] = await Promise.all([
    leaderboardService.listLeaderboard(viewer, { limit: 1000 }),
    feedService.listFeed(viewer, {
      cursor: null,
      authorId: userId,
      includeExcludedAuthor: true,
    }),
    recognitionService.listEarnedBadges(viewer, userId),
  ]);
  const rank = ranking.findIndex((row) => row.user.id === userId) + 1;
  const standing = ranking[rank - 1];
  const isOwnProfile = viewer?.id === profile.id;
  const ipaUrl = new URL(`https://${env.FREEIPA_SERVER}`);
  const people = ranking.map((row) => row.user);
  const profileCanAppearInPicker = !profile.excluded;
  if (rank === 0 && profileCanAppearInPicker) {
    people.push({
      id: profile.id,
      displayName: profile.displayName,
    });
  }

  return (
    <Page
      title={profile.displayName}
      description={
        profile.excluded ? "Not on the public leaderboard" : `Standing on ${formatDate(new Date())}`
      }
      actions={
        <div className="flex items-center gap-2">
          {viewer?.roles.includes("admin") && (
            <ExclusionControl userId={profile.id} excluded={profile.excluded} />
          )}
          <UserAvatar
            name={profile.displayName}
            className="size-14 text-lg ring-2 ring-foreground"
          />
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          {badges.length > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <h2 className="text-base font-black">Badges</h2>
                <EarnedBadges badges={badges} />
              </CardContent>
            </Card>
          )}
          {!profile.excluded && (
            <dl className="grid grid-cols-3 gap-3">
              <Stat label="Rank" highlight>
                {rank > 0 ? `#${String(rank)}` : "-"}
                <span className="text-xs font-normal"> of {ranking.length}</span>
              </Stat>
              <Stat label="Points">{standing?.totalPoints ?? 0}</Stat>
              <Stat label="Tasks done">{standing?.approvedProofs ?? 0}</Stat>
            </dl>
          )}

          {!profile.excluded && (
            <Card>
              <CardContent className="flex flex-col gap-4">
                <h2 className="text-base font-black">Points compared to others</h2>
                <PointsChart bars={chartBars(ranking, profile.displayName, userId)} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          {!profile.excluded && (
            <Card>
              <CardContent>
                <UserPicker users={people} current={userId} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="flex flex-col gap-2">
              <h2 className="text-base font-black">History</h2>
              <CompletedTasks entries={completed.entries} />
            </CardContent>
          </Card>
          {isOwnProfile && (
            <Card>
              <CardContent className="flex flex-col items-start gap-4">
                <h2 className="text-base font-black">Settings</h2>
                <section className="w-full">
                  <h3 className="mb-2 text-sm font-bold">Notifications</h3>
                  <DesktopNotifications vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
                </section>
                <Link
                  href={ipaUrl.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-foreground underline underline-offset-4"
                >
                  FreeIPA server
                  <ExternalLink aria-hidden="true" className="size-4" />
                </Link>
                <SignOutButton variant="danger" />
              </CardContent>
            </Card>
          )}
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
