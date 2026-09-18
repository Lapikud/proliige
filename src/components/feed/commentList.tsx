"use client";

import { Trash2 } from "lucide-react";
import type { FC } from "react";
import { deleteCommentAction } from "~/actions/feed";
import { useAction } from "~/lib/form";
import { cn, formatRelative } from "~/lib/utils";
import { Button } from "../ui/button";
import { ErrorState } from "../ui/feedback";
import type { CommentView } from "./model";

interface Props {
  comments: Array<CommentView>;
  onDeleted: (commentId: string) => void;
}

export const CommentList: FC<Props> = ({ comments, onDeleted }) => {
  const { run, pending, error } = useAction(deleteCommentAction, {
    onSuccess: (_, { commentId }) => {
      onDeleted(commentId);
    },
  });

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">No comments yet.</p>;
  }

  return (
    <>
      {error && <ErrorState description={error} />}
      <ul className="flex list-none flex-col gap-3 p-0">
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
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  run({ commentId: comment.id });
                }}
                aria-label="Delete this comment"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
};
