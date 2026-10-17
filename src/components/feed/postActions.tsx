"use client";

import { MessageCircle } from "lucide-react";
import type { FC } from "react";
import { Button } from "../ui/button";
import { CommentSection } from "./commentSection";
import { LikeButton } from "./likeButton";
import type { Post } from "./usePost";

interface Props {
  post: Post;
  postId: string;
  canReact: boolean;
}

export const PostActions: FC<Props> = ({ post, postId, canReact }) => (
  <>
    <div className="flex items-center gap-1 px-2 pt-1">
      <LikeButton like={post.like} disabled={!canReact} />
      <Button variant="ghost" aria-expanded={post.comments.open} onClick={post.comments.toggle}>
        <MessageCircle aria-hidden="true" className="size-5!" />
        <span className="tabular-nums">{post.comments.count}</span>
        <span className="sr-only">comments</span>
      </Button>
    </div>
    {post.comments.open && (
      <div className="mt-2 flex flex-col gap-3 border-t border-border bg-muted px-4 py-4">
        <CommentSection proofId={postId} canReact={canReact} section={post.comments} />
      </div>
    )}
  </>
);
