"use client";

import { useRef, useState } from "react";
import { commentsResponseSchema, type CommentView } from "./model";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

export function useFeedComments(proofId: string, initialCount: number) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Array<CommentView>>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  // The ref changes immediately, so repeated clicks cannot start duplicate requests.
  const statusRef = useRef<LoadStatus>("idle");

  const load = async () => {
    if (statusRef.current === "loading" || statusRef.current === "loaded") {
      return;
    }

    statusRef.current = "loading";
    setStatus("loading");

    try {
      const response = await fetch(`/api/feed/${proofId}/comments`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load comments.");
      }

      const result = commentsResponseSchema.parse(await response.json());
      setComments(result.comments);
      statusRef.current = "loaded";
      setStatus("loaded");
    } catch {
      statusRef.current = "error";
      setStatus("error");
    }
  };

  const toggle = () => {
    setOpen((current) => !current);
    if (!open) {
      void load();
    }
  };

  const onPosted = (comment: CommentView) => {
    setComments((current) => [...current, comment]);
  };

  const onDeleted = (commentId: string) => {
    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              deleted: true,
              deletable: false,
              body: "[comment removed]",
            }
          : comment,
      ),
    );
  };

  return {
    open,
    comments,
    status,
    count:
      status === "loaded" ? comments.filter((comment) => !comment.deleted).length : initialCount,
    toggle,
    retry: load,
    onPosted,
    onDeleted,
  };
}
