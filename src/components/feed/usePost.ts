"use client";

import { useState } from "react";
import { useLike } from "./likeButton";
import type { FeedEntryView } from "./model";
import { useFeedComments } from "./useFeedComments";

export function usePost(entry: FeedEntryView) {
  const comments = useFeedComments(entry.proofId, entry.commentCount);
  const like = useLike(entry.proofId, entry.likedByUser, entry.likeCount);
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(0);

  const openPost = (index = 0) => {
    setPhoto(index);
    setOpen(true);
    void comments.retry();
  };

  return {
    comments,
    like,
    open,
    setOpen,
    photo,
    setPhoto,
    openPost,
  };
}

export type Post = ReturnType<typeof usePost>;
