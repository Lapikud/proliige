"use client";

import { MessageCircle } from "lucide-react";
import { type FC, useLayoutEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { UserText } from "../ui/markdown";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { CommentSection } from "./commentSection";
import { LikeButton, useLike } from "./likeButton";
import type { FeedEntryView } from "./model";
import { PhotoCarousel } from "./photoCarousel";
import { PostDialog } from "./postDialog";
import { PostHeader } from "./postHeader";
import { useFeedComments } from "./useFeedComments";

interface Props {
  entry: FeedEntryView;
  canReact: boolean;
}

export const FeedCard: FC<Props> = ({ entry, canReact }) => {
  const commentSection = useFeedComments(entry.proofId, entry.commentCount);
  const like = useLike(entry.proofId, entry.likedByUser, entry.likeCount);
  const [postOpen, setPostOpen] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [clamped, setClamped] = useState(false);
  const text = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = text.current;
    if (element) setClamped(element.scrollHeight > element.clientHeight + 1);
  }, [entry.textAnswer]);

  const openPost = (index = 0) => {
    setPhoto(index);
    setPostOpen(true);
    void commentSection.retry();
  };

  return (
    <Card
      className={cn(
        "overflow-hidden",
        entry.photoUrls.length === 0 && !commentSection.open && "pb-4",
      )}
    >
      <PostHeader entry={entry} />

      <PhotoCarousel
        urls={entry.photoUrls}
        alt={`Photo for ${entry.taskTitle}`}
        onOpen={openPost}
      />

      {entry.textAnswer && (
        <>
          <div
            ref={text}
            className={cn(
              "px-4 leading-relaxed text-pretty",
              entry.textMarkdown ? "max-h-[6lh] overflow-hidden" : "line-clamp-4",
              entry.textMarkdown &&
                clamped &&
                "[mask-image:linear-gradient(to_bottom,black_60%,transparent)]",
              entry.photoUrls.length === 0
                ? "pt-2 text-lg sm:text-xl md:text-2xl"
                : "pt-1 text-base",
            )}
          >
            <UserText text={entry.textAnswer} markdown={entry.textMarkdown} />
          </div>
          {clamped && (
            <button
              type="button"
              onClick={() => {
                openPost();
              }}
              className="self-start px-4 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              more
            </button>
          )}
        </>
      )}

      <p
        className={cn("px-4 leading-relaxed", {
          "pt-2 pb-4 text-sm text-muted-foreground": !!entry.textAnswer,
          "py-4 text-lg text-pretty wrap-break-word sm:text-xl md:text-2xl":
            !entry.textAnswer && entry.photoUrls.length === 0,
          "pt-1 pb-4 text-sm": !entry.textAnswer && entry.photoUrls.length > 0,
        })}
      >
        Completed{" "}
        <button
          type="button"
          onClick={() => {
            openPost();
          }}
          aria-haspopup="dialog"
          className="text-left font-bold text-brand-ink hover:underline"
        >
          {entry.taskTitle}
        </button>
        {entry.taskRemoved ? " (removed)" : ""}.
      </p>

      <div className="flex items-center gap-1 px-2 pt-1">
        <LikeButton like={like} disabled={!canReact} />
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
      <PostDialog
        entry={entry}
        canReact={canReact}
        open={postOpen}
        onOpenChange={setPostOpen}
        like={like}
        comments={commentSection}
        photo={photo}
        onPhotoChange={setPhoto}
      />
    </Card>
  );
};
