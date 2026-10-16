"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { cn, formatRelative } from "~/lib/utils";
import { EarnedBadges } from "../badges/earnedBadges";
import { UserAvatar } from "../ui/avatar";
import { UserText } from "../ui/markdown";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { CommentSection } from "./commentSection";
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
    <Card
      className={cn(
        "overflow-hidden",
        entry.photoUrls.length === 0 && !commentSection.open && "pb-4",
      )}
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <Link href={`/users/${entry.user.id}`} aria-hidden="true" tabIndex={-1}>
          <UserAvatar name={entry.user.displayName} className="size-9 text-xs" />
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
            <time dateTime={entry.approvedAt}>{formatRelative(entry.approvedAt)}</time>
            {" · "}
            {entry.categoryName}
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
      </header>

      <PhotoCarousel urls={entry.photoUrls} alt={`Photo for ${entry.taskTitle}`} />

      {entry.textAnswer && (
        <UserText
          text={entry.textAnswer}
          markdown={entry.textMarkdown}
          className={cn(
            "px-4 leading-relaxed text-pretty",
            entry.photoUrls.length === 0 ? "pt-2 text-lg sm:text-xl md:text-2xl" : "pt-1 text-base",
          )}
        />
      )}

      <p
        className={cn("px-4 leading-relaxed", {
          "pt-2 pb-4 text-sm text-muted-foreground": !!entry.textAnswer,
          "py-4 text-lg text-pretty wrap-break-word sm:text-xl md:text-2xl":
            !entry.textAnswer && entry.photoUrls.length === 0,
          "pt-1 pb-4 text-sm": !entry.textAnswer && entry.photoUrls.length > 0,
        })}
      >
        Completed <span className="font-bold text-brand-ink">{entry.taskTitle}</span>
        {entry.taskRemoved ? " (removed)" : ""}.
      </p>

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

      {commentSection.open && (
        <div className="flex flex-col gap-3 border-t border-border bg-muted px-4 py-4">
          <CommentSection proofId={entry.proofId} canReact={canReact} section={commentSection} />
        </div>
      )}
    </Card>
  );
};
