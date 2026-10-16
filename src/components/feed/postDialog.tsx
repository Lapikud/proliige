"use client";

import { MessageCircle, X } from "lucide-react";
import { type FC, type ReactNode, useRef } from "react";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { CommentForm } from "./commentForm";
import { CommentSection } from "./commentSection";
import { LikeButton } from "./likeButton";
import type { FeedEntryView } from "./model";
import { PhotoViewer, photoKeys } from "./photoViewer";
import { PostHeader } from "./postHeader";
import { SignInPrompt } from "./signInPrompt";
import type { Post } from "./usePost";

interface Props {
  entry: FeedEntryView;
  post: Post;
  canReact: boolean;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

export const PostDialog: FC<Props> = ({ entry, post, canReact, title, subtitle, children }) => {
  const close = useRef<HTMLButtonElement>(null);
  const hasPhotos = entry.photoUrls.length > 0;
  const viewer = (className: string) => (
    <PhotoViewer
      urls={entry.photoUrls}
      alt={`Photo for ${entry.taskTitle}`}
      index={post.photo}
      onIndexChange={post.setPhoto}
      className={className}
    />
  );

  return (
    <Dialog open={post.open} onOpenChange={post.setOpen}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          close.current?.focus();
        }}
        onKeyDown={photoKeys(post.photo, entry.photoUrls.length, post.setPhoto)}
        className={cn(
          "flex max-h-[85dvh] flex-col overflow-hidden p-0",
          hasPhotos ? "max-w-5xl md:h-[min(85dvh,800px)] md:flex-row" : "max-w-xl",
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogClose asChild>
          <Button
            ref={close}
            type="button"
            variant="ghost"
            aria-label="Close post"
            className={cn(
              "absolute top-2 right-2 z-10 size-11 p-0",
              hasPhotos &&
                "bg-black/50 text-white hover:bg-black/70 hover:text-white md:bg-transparent md:text-foreground md:hover:bg-muted md:hover:text-foreground",
            )}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </DialogClose>
        {hasPhotos && viewer("hidden md:flex md:h-full md:min-w-0 md:flex-1")}
        <section
          className={cn("flex min-h-0 flex-1 flex-col", hasPhotos && "md:w-96 md:flex-none")}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {hasPhotos && viewer("aspect-square md:hidden")}
            <PostHeader entry={entry} subtitle={subtitle} className="pr-14" />
            <div className="flex flex-col gap-3 px-4 pb-4">
              {children}
              <section aria-label="Comments" className="flex flex-col gap-3 pt-1">
                <CommentSection
                  proofId={entry.proofId}
                  canReact={canReact}
                  section={post.comments}
                  hideForm
                />
              </section>
            </div>
          </div>
          <footer className="flex flex-col gap-2 bg-muted/50 px-4 pt-1 pb-3">
            <div className="-mx-2 flex items-center gap-1">
              <LikeButton like={post.like} disabled={!canReact} />
              <span className="inline-flex items-center gap-1.5 px-2 text-sm text-muted-foreground">
                <MessageCircle aria-hidden="true" className="size-4" />
                <span className="tabular-nums">{post.comments.count}</span> comments
              </span>
            </div>
            {canReact ? (
              <CommentForm proofId={entry.proofId} onPosted={post.comments.onPosted} compact />
            ) : (
              <SignInPrompt />
            )}
          </footer>
        </section>
      </DialogContent>
    </Dialog>
  );
};
