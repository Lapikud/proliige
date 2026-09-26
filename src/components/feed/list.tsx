"use client";

import { type FC, useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  const loadingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(
    (from: string) => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;

      startLoading(async () => {
        setError(null);
        try {
          const response = await fetch(feedUrl(from, categoryId));
          if (!response.ok) {
            throw new Error("Could not load more entries.");
          }
          const page = (await response.json()) as FeedPage;
          setEntries((current) => [...current, ...page.entries]);
          setCursor(page.nextCursor);
        } catch {
          setError("Could not load more entries.");
        } finally {
          loadingRef.current = false;
        }
      });
    },
    [categoryId, startLoading],
  );

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !cursor || error) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadMore(cursor);
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [cursor, error, loadMore]);

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
    <div className="flex flex-col gap-4" aria-busy={loading}>
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

      {error && (
        <ErrorState description={error}>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => {
              if (cursor) {
                loadMore(cursor);
              }
            }}
          >
            {loading ? "Trying again…" : "Try again"}
          </Button>
        </ErrorState>
      )}

      {cursor && !error && (
        <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center">
          {loading && (
            <span role="status" className="text-sm text-muted-foreground">
              Loading more…
            </span>
          )}
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
