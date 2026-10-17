"use client";

import { EyeOff } from "lucide-react";
import { type FC, useState } from "react";
import { cn } from "~/lib/utils";
import { UserText } from "../ui/markdown";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { ClampedText } from "./clampedText";
import type { FeedEntryView } from "./model";
import { PhotoCarousel } from "./photoCarousel";
import { PostActions } from "./postActions";
import { PostDialog } from "./postDialog";
import { PostHeader } from "./postHeader";
import { PostMenu } from "./postMenu";
import { usePost } from "./usePost";

interface Props {
  entry: FeedEntryView;
  canReact: boolean;
  canModerate: boolean;
  viewerId: string | null;
}

export const FeedCard: FC<Props> = ({ entry, canReact, canModerate, viewerId }) => {
  const post = usePost(entry);
  const [removed, setRemoved] = useState(entry.offFeed === "removed");
  const taskOffFeed = entry.offFeed === "task";
  const offFeedLabel = removed ? "Removed from feed" : "Its task is kept off the feed";
  const [unapproved, setUnapproved] = useState(false);
  const showMenu = canModerate || (viewerId !== null && viewerId !== entry.user.id);
  const openPost = () => {
    post.openPost();
  };
  const completed = (
    <>
      Completed{" "}
      <button
        type="button"
        onClick={openPost}
        aria-haspopup="dialog"
        className="text-left font-bold text-brand-ink hover:underline"
      >
        {entry.taskTitle}
      </button>
      {entry.taskRemoved ? " (removed)" : ""}.
    </>
  );

  if (unapproved) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          Unapproved {entry.user.displayName}&rsquo;s {entry.taskTitle}. The points were taken back.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden",
        entry.photoUrls.length === 0 && !post.comments.open && "pb-4",
      )}
    >
      <PostHeader entry={entry}>
        {(removed || taskOffFeed) && (
          <Badge variant="neutral" title={offFeedLabel}>
            <EyeOff className="size-3.5" aria-hidden />
            <span className="sr-only">{offFeedLabel}</span>
          </Badge>
        )}
        {showMenu && (
          <PostMenu
            proofId={entry.proofId}
            taskTitle={entry.taskTitle}
            points={entry.points}
            hidden={removed}
            canHide={!taskOffFeed}
            reported={entry.reportedByUser}
            canModerate={canModerate}
            onHiddenChange={setRemoved}
            onUnapproved={() => {
              setUnapproved(true);
            }}
          />
        )}
      </PostHeader>

      <PhotoCarousel
        urls={entry.photoUrls}
        alt={`Photo for ${entry.taskTitle}`}
        onOpen={post.openPost}
      />

      {entry.textAnswer && (
        <ClampedText
          text={entry.textAnswer}
          markdown={entry.textMarkdown}
          onMore={openPost}
          className={cn(
            "px-4",
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
        {completed}
      </p>

      <PostActions post={post} postId={entry.proofId} canReact={canReact} />

      <PostDialog
        entry={entry}
        post={post}
        canReact={canReact}
        title={`${entry.user.displayName} completed ${entry.taskTitle}`}
      >
        {entry.textAnswer && (
          <UserText
            text={entry.textAnswer}
            markdown={entry.textMarkdown}
            className={cn(
              "leading-relaxed text-pretty",
              entry.photoUrls.length > 0 ? "text-lg" : "text-xl sm:text-2xl",
            )}
          />
        )}
        <p className="text-sm text-muted-foreground">
          Completed <span className="font-bold text-brand-ink">{entry.taskTitle}</span>
          {entry.taskRemoved ? " (removed)" : ""}.
        </p>
      </PostDialog>
    </Card>
  );
};
