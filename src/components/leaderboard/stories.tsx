import Link from "next/link";
import type { FC } from "react";
import type { LeaderboardRow } from "~/domain/points";
import { cn } from "~/lib/utils";
import { type LeaderboardPeriod, PeriodToggle } from "./periodToggle";
import { UserAvatar } from "../ui/avatar";

interface Props {
  rows: ReadonlyArray<LeaderboardRow>;
  period: LeaderboardPeriod;
  keep?: Record<string, string>;
}

export const LeaderboardStories: FC<Props> = ({ rows, period, keep }) => (
  <section aria-label="Leaderboard" className="flex flex-col gap-1">
    <div className="flex min-h-11 items-center justify-between gap-2">
      <h2 className="text-sm font-bold">Leaderboard</h2>
      <PeriodToggle current={period} {...(keep ? { keep } : {})} />
    </div>
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        {period === "month" ? "No points yet this month." : "No points yet."}
      </p>
    ) : (
      <ol className="flex [scrollbar-width:none] list-none gap-2 overflow-x-auto p-0 pb-1">
        {rows.map((row, index) => (
          <li key={row.user.id} className="shrink-0">
            <Link
              href={`/users/${row.user.id}`}
              className="flex min-h-16 w-16 flex-col items-center gap-1 rounded-xl text-foreground"
            >
              <span
                className={cn(
                  "relative inline-flex size-12 rounded-full p-[3px]",
                  ringColor(index + 1),
                )}
              >
                <UserAvatar
                  name={row.user.displayName}
                  className="size-full bg-card text-sm text-foreground ring-2 ring-card"
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-1.5 font-mono text-xs text-primary">
                  #{index + 1}
                </span>
              </span>
              <span className="max-w-full truncate text-xs font-bold">
                {row.user.displayName.split(" ")[0]}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    )}
  </section>
);

function ringColor(rank: number): string {
  if (rank === 1) {
    return "bg-primary";
  }
  if (rank === 2) {
    return "bg-silver";
  }
  if (rank === 3) {
    return "bg-bronze";
  }

  return "bg-border";
}
