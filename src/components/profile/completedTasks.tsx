import type { FC } from "react";
import type { FeedEntry } from "~/domain/feed";
import { formatDate } from "~/lib/utils";
import { Badge } from "../ui/badge";

export const CompletedTasks: FC<{ entries: ReadonlyArray<FeedEntry> }> = ({ entries }) => {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No approved tasks yet.</p>;
  }

  return (
    <ul className="flex list-none flex-col p-0">
      {entries.map((entry) => (
        <li
          key={entry.proofId}
          className="flex items-center gap-3 border-t border-border py-3 first:border-t-0"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold">{entry.taskTitle}</span>
            <span className="text-xs text-muted-foreground">
              {entry.categoryName} ·{" "}
              <time dateTime={entry.approvedAt.toISOString()}>{formatDate(entry.approvedAt)}</time>
            </span>
          </div>
          <Badge variant="points" className="tabular-nums">
            +{entry.points}
          </Badge>
        </li>
      ))}
    </ul>
  );
};
