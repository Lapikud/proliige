"use client";

import type { FC } from "react";
import { cn } from "~/lib/utils";
import { UserText } from "../ui/markdown";
import { Card } from "../ui/card";
import { ClampedText } from "./clampedText";
import type { FeedEntryView } from "./model";
import { PhotoCarousel } from "./photoCarousel";
import { PostActions } from "./postActions";
import { PostDialog } from "./postDialog";
import { PostHeader } from "./postHeader";
import { usePost } from "./usePost";

interface Props {
  entry: FeedEntryView;
  canReact: boolean;
}

export const FeedCard: FC<Props> = ({ entry, canReact }) => {
  const post = usePost(entry);
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

  return (
    <Card
      className={cn(
        "overflow-hidden",
        entry.photoUrls.length === 0 && !post.comments.open && "pb-4",
      )}
    >
      <PostHeader entry={entry} />

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
