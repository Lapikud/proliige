import Link from "next/link";
import type { FC } from "react";
import type { LeaderboardRow } from "~/domain/points";
import { cn } from "~/lib/utils";
import { type LeaderboardPeriod, PeriodToggle } from "./periodToggle";
import { UserAvatar } from "../ui/avatar";
import { Card } from "../ui/card";

interface Props {
  rows: ReadonlyArray<LeaderboardRow>;
  currentUserId: string | null;
  period: LeaderboardPeriod;
  keep?: Record<string, string>;
}

export const LeaderboardPanel: FC<Props> = ({ rows, currentUserId, period, keep }) => (
  <Card className="overflow-hidden">
    <h2 className="border-b border-border px-4 py-3 font-heading text-sm font-bold tracking-wide uppercase">
      Leaderboard
    </h2>
    {rows.length === 0 ? (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        {period === "month"
          ? "No points yet this month."
          : "No points yet. The first approved proof starts the race."}
      </p>
    ) : (
      <ol className="flex list-none flex-col p-2">
        {rows.map((row, index) => {
          const rank = index + 1;
          const mine = row.user.id === currentUserId;

          return (
            <li key={row.user.id}>
              <Link
                href={`/users/${row.user.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted",
                  mine && "bg-brand-soft",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs",
                    rank === 1 && "border-2 border-foreground bg-primary font-bold shadow-hard-sm",
                    rank === 2 && "border-2 border-foreground bg-silver font-bold shadow-hard-sm",
                    rank === 3 && "border-2 border-foreground bg-bronze font-bold shadow-hard-sm",
                    rank > 3 && "text-muted-foreground",
                  )}
                >
                  {rank}
                </span>
                <UserAvatar name={row.user.displayName} className="size-8" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">
                    {row.user.displayName}
                    {mine && <span className="font-normal text-brand-ink"> (you)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.approvedProofs} approved
                  </span>
                </span>
                <span className="font-mono text-sm tabular-nums">{row.totalPoints}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    )}
    <div className="border-t border-border px-4 py-2">
      <PeriodToggle current={period} {...(keep ? { keep } : {})} />
    </div>
  </Card>
);
