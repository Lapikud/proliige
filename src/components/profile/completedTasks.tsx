import type { FC } from "react";
import type { FeedEntry } from "~/domain/feed";
import { formatDate } from "~/lib/utils";
import { Badge } from "../ui/badge";

export const CompletedTasks: FC<{ entries: ReadonlyArray<FeedEntry> }> = ({ entries }) => {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No approved tasks or recognitions yet.</p>;
  }

  return (
    <ul className="flex list-none flex-col p-0">
      {entries.map((entry) => (
        <li
          key={`${entry.kind}-${entry.proofId}`}
          className="flex items-center gap-3 border-t border-border py-3 first:border-t-0"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold">
              {entry.kind === "recognition" ? "Contribution recognized" : entry.taskTitle}
              {entry.kind === "proof" && entry.taskRemoved ? " · Removed" : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              {entry.kind === "recognition"
                ? `Recognized by ${entry.reviewer?.displayName ?? "a reviewer"}`
                : entry.categoryName}
              {" · "}
              <time dateTime={entry.approvedAt.toISOString()}>{formatDate(entry.approvedAt)}</time>
            </span>
            {entry.kind === "recognition" && (
              <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {entry.recognitionDescription}
              </span>
            )}
          </div>
          {entry.kind === "proof" && entry.pointsReversed ? (
            <Badge variant="neutral">Points reversed</Badge>
          ) : entry.points > 0 ? (
            <Badge variant="points" className="tabular-nums">
              +{entry.points}
            </Badge>
          ) : null}
        </li>
      ))}
    </ul>
  );
};
