import Link from "next/link";
import type { FC } from "react";
import { cn } from "~/lib/utils";

export type LeaderboardPeriod = "all" | "month";

export const leaderboardPeriod = (value: unknown): LeaderboardPeriod =>
  value === "month" ? "month" : "all";

const options: ReadonlyArray<{
  period: LeaderboardPeriod;
  label: string;
}> = [
  {
    period: "all",
    label: "All time",
  },
  {
    period: "month",
    label: "This month",
  },
];

interface Props {
  current: LeaderboardPeriod;
  keep?: Record<string, string>;
}

export const PeriodToggle: FC<Props> = ({ current, keep = {} }) => (
  <nav aria-label="Leaderboard period" className="flex gap-4">
    {options.map(({ period, label }) => {
      const params = new URLSearchParams({
        ...keep,
        ...(period === "month" ? { period } : {}),
      }).toString();

      return (
        <Link
          key={period}
          href={params ? `/?${params}` : "/"}
          scroll={false}
          aria-current={current === period ? "page" : undefined}
          className={cn(
            "inline-flex min-h-8 items-center text-xs",
            current === period
              ? "font-bold text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      );
    })}
  </nav>
);
