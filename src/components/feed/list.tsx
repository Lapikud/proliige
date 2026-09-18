"use client";

import { type FC, useState, useTransition } from "react";
import { Button } from "../ui/button";
import { EmptyState, ErrorState } from "../ui/feedback";
import { FeedCard } from "./card";
import type { CommentView, FeedEntryView } from "./model";

interface Props {
  initialEntries: Array<FeedEntryView>;
  initialCursor: string | null;
  commentsByProof: Record<string, Array<CommentView>>;
  canReact: boolean;
  categoryId: string | null;
  categoryName: string | null;
}

interface FeedPage {
  entries: Array<FeedEntryView>;
  nextCursor: string | null;
}

export const FeedList: FC<Props> = ({
  initialEntries,
  initialCursor,
  commentsByProof,
  canReact,
  categoryId,
  categoryName,
}) => {
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const loadMore = (from: string) => {
    startLoading(async () => {
      setError(null);
      const response = await fetch(feedUrl(from, categoryId));
      if (!response.ok) {
        setError("Could not load more entries.");

        return;
      }
      const page = (await response.json()) as FeedPage;
      setEntries((current) => [...current, ...page.entries]);
      setCursor(page.nextCursor);
    });
  };

  if (entries.length === 0) {
    return categoryName ? (
      <EmptyState
        title={`Nothing in ${categoryName} yet`}
        description="Pick another category, or All."
      />
    ) : (
      <EmptyState
        title="Nothing here yet"
        description="Approved proofs will appear here as they happen."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex list-none flex-col gap-4 p-0">
        {entries.map((entry) => (
          <li key={entry.proofId}>
            <FeedCard
              entry={entry}
              initialComments={commentsByProof[entry.proofId] ?? []}
              canReact={canReact}
            />
          </li>
        ))}
      </ul>

      {error && <ErrorState description={error} />}

      {cursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              loadMore(cursor);
            }}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
};

function feedUrl(cursor: string, categoryId: string | null): string {
  const params = new URLSearchParams({ cursor });
  if (categoryId) {
    params.set("category", categoryId);
  }

  return `/api/feed?${params}`;
}
