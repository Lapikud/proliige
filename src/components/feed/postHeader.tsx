import Link from "next/link";
import type { FC, ReactNode } from "react";
import { cn, formatRelative } from "~/lib/utils";
import { EarnedBadges } from "../badges/earnedBadges";
import { UserAvatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import type { FeedEntryView } from "./model";

interface Props {
  entry: FeedEntryView;
  subtitle?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export const PostHeader: FC<Props> = ({ entry, subtitle, className, children }) => (
  <header className={cn("flex items-center gap-3 px-4 py-3", className)}>
    <Link href={`/users/${entry.user.id}`} aria-hidden="true" tabIndex={-1}>
      <UserAvatar
        name={entry.user.displayName}
        className="size-9 text-xs"
        crowned={entry.crowned === true}
      />
    </Link>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 items-center gap-1.5">
        <Link
          href={`/users/${entry.user.id}`}
          className="truncate text-sm font-bold text-foreground hover:text-brand-ink"
        >
          {entry.user.displayName}
        </Link>
        <EarnedBadges badges={entry.authorBadges} compact />
      </div>
      <span className="truncate text-xs text-muted-foreground">
        {subtitle ?? (
          <>
            <time dateTime={entry.approvedAt}>{formatRelative(entry.approvedAt)}</time>
            {" · "}
            {entry.categoryName}
          </>
        )}
      </span>
    </div>
    {entry.taskRemoved && <Badge variant="neutral">Removed task</Badge>}
    {entry.pointsReversed ? (
      <Badge variant="neutral">Points reversed</Badge>
    ) : entry.points > 0 ? (
      <Badge variant="points" className="tabular-nums">
        +{entry.points}
      </Badge>
    ) : null}
    {children}
  </header>
);
