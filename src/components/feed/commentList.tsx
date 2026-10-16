"use client";

import { Trash2 } from "lucide-react";
import { useRef, type FC } from "react";
import { cn, formatRelative } from "~/lib/utils";
import { Button } from "../ui/button";
import { DeleteCommentDialog } from "./deleteCommentDialog";
import type { CommentView } from "./model";
import { useDeleteComment } from "./useDeleteComment";

interface Props {
  comments: Array<CommentView>;
  onDeleted: (commentId: string) => void;
}

export const CommentList: FC<Props> = ({ comments, onDeleted }) => {
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const deletedRef = useRef(false);
  const deletion = useDeleteComment((commentId) => {
    deletedRef.current = true;
    onDeleted(commentId);
  });

  const restoreFocus = () => {
    if (deletedRef.current) {
      // The delete button disappears after success, so focus the still-present list.
      listRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }

    deletedRef.current = false;
    triggerRef.current = null;
  };

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">Be the first to comment.</p>;
  }

  return (
    <>
      <ul
        ref={listRef}
        tabIndex={-1}
        aria-label="Comments"
        className="flex list-none flex-col gap-3 p-0"
      >
        {comments.map((comment) => (
          <li key={comment.id} className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium text-foreground">{comment.authorName}</span>{" "}
                <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
                  {formatRelative(comment.createdAt)}
                </time>
              </p>
              <p
                className={cn(
                  "text-sm whitespace-pre-wrap text-foreground/80",
                  comment.deleted && "text-muted-foreground italic",
                )}
              >
                {comment.body}
              </p>
            </div>
            {comment.deletable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deletion.pending}
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  deletion.requestDelete(comment.id);
                }}
                aria-label={`Delete comment by ${comment.authorName}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <DeleteCommentDialog
        open={deletion.open}
        pending={deletion.pending}
        error={deletion.error}
        onDismiss={deletion.dismiss}
        onConfirm={deletion.confirm}
        onClosed={restoreFocus}
      />
    </>
  );
};
