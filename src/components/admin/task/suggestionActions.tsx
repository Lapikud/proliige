"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { declineSuggestionAction, publishSuggestionAction } from "~/actions/task";
import { useAction } from "~/lib/form";
import { Button } from "../../ui/button";
import type { TaskView } from "./model";

export const SuggestionActions: FC<{ readonly task: TaskView }> = ({ task }) => {
  const options = {
    onError: (message: string) => {
      toast.error(message);
    },
  };
  const publish = useAction(publishSuggestionAction, {
    ...options,
    onSuccess: () => {
      toast.success(`Published "${task.title}".`);
    },
  });
  const decline = useAction(declineSuggestionAction, {
    ...options,
    onSuccess: () => {
      toast.success(`Declined "${task.title}".`);
    },
  });
  const pending = publish.pending || decline.pending;

  return (
    <span className="flex shrink-0 gap-1">
      <Button
        variant="subtle"
        size="sm"
        className="w-9 px-0"
        aria-label={`Publish ${task.title}`}
        title={`Publish ${task.title}`}
        disabled={pending}
        onClick={() => {
          publish.run({ taskId: task.id });
        }}
      >
        {publish.pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
      </Button>
      <Button
        variant="subtle"
        size="sm"
        className="w-9 px-0"
        aria-label={`Decline ${task.title}`}
        title={`Decline ${task.title}`}
        disabled={pending}
        onClick={() => {
          decline.run({ taskId: task.id });
        }}
      >
        {decline.pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
      </Button>
    </span>
  );
};
