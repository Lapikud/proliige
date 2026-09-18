import Link from "next/link";
import type { FC } from "react";
import type { LeaderboardRow } from "~/domain/points";
import { cn } from "~/lib/utils";
import { UserAvatar } from "../ui/avatar";

export const LeaderboardStories: FC<{ rows: ReadonlyArray<LeaderboardRow> }> = ({ rows }) => {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section aria-label="Leaderboard">
      <ol className="flex [scrollbar-width:none] list-none gap-3 overflow-x-auto p-0 pb-2">
        {rows.map((row, index) => (
          <li key={row.user.id} className="shrink-0">
            <Link
              href={`/users/${row.user.id}`}
              className="flex w-16 flex-col items-center gap-1.5 rounded-xl text-foreground"
            >
              <span
                className={cn(
                  "relative inline-flex size-16 rounded-full p-[3px]",
                  ringColor(index + 1),
                )}
              >
                <UserAvatar
                  name={row.user.displayName}
                  className="size-full bg-card text-sm text-foreground ring-2 ring-card"
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-1.5 font-mono text-[10px] text-primary">
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
    </section>
  );
};

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
