"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { formatRelative } from "~/lib/utils";
import { UserAvatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ErrorState, Skeleton } from "../ui/feedback";
import { CommentForm } from "./commentForm";
import { CommentList } from "./commentList";
import { LikeButton } from "./likeButton";
import type { FeedEntryView } from "./model";
import { PhotoCarousel } from "./photoCarousel";
import { useFeedComments } from "./useFeedComments";

interface Props {
  entry: FeedEntryView;
  canReact: boolean;
}

export const FeedCard: FC<Props> = ({ entry, canReact }) => {
  const commentSection = useFeedComments(entry.proofId, entry.commentCount);

  return (
    <Card className="overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3">
        <Link href={`/users/${entry.user.id}`} aria-hidden="true" tabIndex={-1}>
          <UserAvatar name={entry.user.displayName} className="size-9 text-xs" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={`/users/${entry.user.id}`}
            className="truncate text-sm font-bold text-foreground hover:text-brand-ink"
          >
            {entry.user.displayName}
          </Link>
          <span className="truncate text-xs text-muted-foreground">
            <time dateTime={entry.approvedAt}>{formatRelative(entry.approvedAt)}</time>
            {" · "}
            {entry.categoryName}
          </span>
        </div>
        <Badge variant="points" className="tabular-nums">
          +{entry.points}
        </Badge>
      </header>

      <PhotoCarousel urls={entry.photoUrls} alt={`Photo for ${entry.taskTitle}`} />

      <div className="flex items-center gap-1 px-2 pt-1">
        <LikeButton
          proofId={entry.proofId}
          liked={entry.likedByUser}
          count={entry.likeCount}
          disabled={!canReact}
        />
        <Button variant="ghost" aria-expanded={commentSection.open} onClick={commentSection.toggle}>
          <MessageCircle aria-hidden="true" className="size-5!" />
          <span className="tabular-nums">{commentSection.count}</span>
          <span className="sr-only">comments</span>
        </Button>
      </div>

      <p className="px-4 pt-1 pb-4 text-sm leading-relaxed">
        <span className="font-bold">{entry.user.displayName}</span> completed{" "}
        <span className="font-bold text-brand-ink">{entry.taskTitle}</span>.
      </p>

      {commentSection.open && (
        <div className="flex flex-col gap-3 border-t border-border bg-muted px-4 py-4">
          <CommentSection proofId={entry.proofId} canReact={canReact} section={commentSection} />
        </div>
      )}
    </Card>
  );
};

interface CommentSectionProps {
  proofId: string;
  canReact: boolean;
  section: ReturnType<typeof useFeedComments>;
}

const CommentSection: FC<CommentSectionProps> = ({ proofId, canReact, section }) => {
  if (section.status === "loading") {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="sr-only">Loading comments…</span>
        <Skeleton className="h-4 w-1/3 bg-foreground/15" />
        <Skeleton className="h-4 w-full bg-foreground/15" />
        <Skeleton className="h-4 w-2/3 bg-foreground/15" />
      </div>
    );
  }

  if (section.status === "error") {
    return (
      <ErrorState description="Could not load comments.">
        <Button size="sm" variant="outline" onClick={() => void section.retry()}>
          Try again
        </Button>
      </ErrorState>
    );
  }

  if (section.status !== "loaded") {
    return null;
  }

  return (
    <>
      <CommentList comments={section.comments} onDeleted={section.onDeleted} />
      {canReact ? <CommentForm proofId={proofId} onPosted={section.onPosted} /> : <SignInPrompt />}
    </>
  );
};

const SignInPrompt: FC = () => (
  <p className="text-sm text-muted-foreground">
    <Link href="/login" className="text-brand-ink underline">
      Sign in
    </Link>{" "}
    to like or comment.
  </p>
);
