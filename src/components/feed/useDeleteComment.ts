"use client";

import { useState } from "react";
import { deleteCommentAction } from "~/actions/feed";
import { useAction } from "~/lib/form";

export function useDeleteComment(onDeleted: (commentId: string) => void) {
  const [commentId, setCommentId] = useState<string | null>(null);
  const { run, pending, error, clearError } = useAction(deleteCommentAction, {
    onSuccess: (_, { commentId: deletedId }) => {
      onDeleted(deletedId);
      setCommentId(null);
    },
  });

  const requestDelete = (id: string) => {
    if (pending) return;

    clearError();
    setCommentId(id);
  };

  const dismiss = () => {
    if (!pending) setCommentId(null);
  };

  const confirm = () => {
    if (commentId === null || pending) return;

    run({ commentId });
  };

  return {
    open: commentId !== null,
    pending,
    error,
    requestDelete,
    dismiss,
    confirm,
  };
}
