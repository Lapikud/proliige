"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { type FC, useState } from "react";
import { formatRelative } from "~/lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { UserAvatar } from "../ui/avatar";
import { Card } from "../ui/card";
import { CommentForm } from "./commentForm";
import { CommentList } from "./commentList";
import { LikeButton } from "./likeButton";
import { PhotoCarousel } from "./photoCarousel";
import type { CommentView, FeedEntryView } from "./model";

interface Props {
  entry: FeedEntryView;
  initialComments: Array<CommentView>;
  canReact: boolean;
}

const removed = (comment: CommentView): CommentView => ({
  ...comment,
  deleted: true,
  deletable: false,
  body: "[comment removed]",
});

export const FeedCard: FC<Props> = ({ entry, initialComments, canReact }) => {
  const [comments, setComments] = useState(initialComments);
  const [open, setOpen] = useState(false);
  const visibleCount = comments.filter((comment) => !comment.deleted).length;

  const markDeleted = (commentId: string) => {
    setComments((current) => current.map((c) => (c.id === commentId ? removed(c) : c)));
  };

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
        <Button
          variant="ghost"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <MessageCircle aria-hidden="true" className="size-5!" />
          <span className="tabular-nums">{visibleCount}</span>
          <span className="sr-only">comments</span>
        </Button>
      </div>

      <p className="px-4 pt-1 pb-4 text-sm leading-relaxed">
        <span className="font-bold">{entry.user.displayName}</span> completed{" "}
        <span className="font-bold text-brand-ink">{entry.taskTitle}</span>.
      </p>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border bg-muted px-4 py-4">
          <CommentList comments={comments} onDeleted={markDeleted} />
          {canReact ? (
            <CommentForm
              proofId={entry.proofId}
              onPosted={(comment) => {
                setComments((current) => [...current, comment]);
              }}
            />
          ) : (
            <SignInPrompt />
          )}
        </div>
      )}
    </Card>
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
