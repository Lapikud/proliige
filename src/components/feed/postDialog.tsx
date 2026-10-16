"use client";

import { MessageCircle, X } from "lucide-react";
import type { FC } from "react";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { UserText } from "../ui/markdown";
import { CommentForm } from "./commentForm";
import { CommentSection } from "./commentSection";
import { LikeButton, type useLike } from "./likeButton";
import type { FeedEntryView } from "./model";
import { PhotoViewer, photoKeys } from "./photoViewer";
import { PostHeader } from "./postHeader";
import { SignInPrompt } from "./signInPrompt";
import type { useFeedComments } from "./useFeedComments";

interface Props {
  entry: FeedEntryView;
  canReact: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  like: ReturnType<typeof useLike>;
  comments: ReturnType<typeof useFeedComments>;
  photo: number;
  onPhotoChange: (index: number) => void;
}

export const PostDialog: FC<Props> = ({
  entry,
  canReact,
  open,
  onOpenChange,
  like,
  comments,
  photo,
  onPhotoChange,
}) => {
  const hasPhotos = entry.photoUrls.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onKeyDown={photoKeys(photo, entry.photoUrls.length, onPhotoChange)}
        className={cn(
          "flex flex-col overflow-hidden p-0 md:flex-row",
          hasPhotos ? "h-[min(85dvh,800px)] max-w-5xl" : "max-h-[85dvh] max-w-xl",
        )}
      >
        <DialogTitle className="sr-only">
          {entry.user.displayName} completed {entry.taskTitle}
        </DialogTitle>
        {hasPhotos && (
          <PhotoViewer
            urls={entry.photoUrls}
            alt={`Photo for ${entry.taskTitle}`}
            index={photo}
            onIndexChange={onPhotoChange}
            className="h-2/5 shrink-0 md:h-full md:min-w-0 md:flex-1"
          />
        )}
        <section
          className={cn("flex min-h-0 flex-1 flex-col", hasPhotos && "md:w-96 md:flex-none")}
        >
          <PostHeader entry={entry} className="border-b border-border">
            <DialogClose asChild>
              <Button type="button" variant="ghost" aria-label="Close post" className="size-11 p-0">
                <X aria-hidden="true" className="size-5" />
              </Button>
            </DialogClose>
          </PostHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {entry.textAnswer && (
              <UserText
                text={entry.textAnswer}
                markdown={entry.textMarkdown}
                className={cn(
                  "leading-relaxed text-pretty",
                  hasPhotos ? "text-lg" : "text-xl sm:text-2xl",
                )}
              />
            )}
            <p className="text-sm text-muted-foreground">
              Completed <span className="font-bold text-brand-ink">{entry.taskTitle}</span>
              {entry.taskRemoved ? " (removed)" : ""}.
            </p>
            <div className="-mx-2 flex items-center gap-1">
              <LikeButton like={like} disabled={!canReact} />
              <span className="inline-flex items-center gap-2 px-3 text-sm text-muted-foreground">
                <MessageCircle aria-hidden="true" className="size-5" />
                <span className="tabular-nums">{comments.count}</span>
                <span className="sr-only">comments</span>
              </span>
            </div>
            <section
              aria-label="Comments"
              className="flex flex-col gap-3 border-t border-border pt-3"
            >
              <CommentSection
                proofId={entry.proofId}
                canReact={canReact}
                section={comments}
                hideForm
              />
            </section>
          </div>
          <footer className="border-t border-border bg-card px-4 py-3">
            {canReact ? (
              <CommentForm proofId={entry.proofId} onPosted={comments.onPosted} />
            ) : (
              <SignInPrompt />
            )}
          </footer>
        </section>
      </DialogContent>
    </Dialog>
  );
};
