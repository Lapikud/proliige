"use client";

import { Archive, ArchiveRestore, LoaderCircle } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { archiveTaskAction } from "~/actions/task";
import { useAction } from "~/lib/form";
import { cn } from "~/lib/utils";
import { Button } from "../../ui/button";
import { undoToast } from "./bulkActions";
import type { TaskView } from "./model";

export const ArchiveTaskButton: FC<{ readonly task: TaskView }> = ({ task }) => {
  const archive = useAction(archiveTaskAction, {
    onSuccess: (_data, { archived }) => {
      if (!archived) return;
      undoToast(
        `Archived "${task.title}".`,
        () =>
          archiveTaskAction({
            taskId: task.id,
            archived: false,
          }),
        `Reactivated "${task.title}".`,
      );
    },
    onError: (message) => {
      toast.error(message);
    },
  });
  const label = `${task.archived ? "Reactivate" : "Archive"} ${task.title}`;
  let Icon = task.archived ? ArchiveRestore : Archive;
  if (archive.pending) Icon = LoaderCircle;

  return (
    <Button
      variant="subtle"
      size="sm"
      className="w-9 shrink-0 px-0"
      aria-label={label}
      title={label}
      disabled={archive.pending}
      onClick={() => {
        archive.run({
          taskId: task.id,
          archived: !task.archived,
        });
      }}
    >
      <Icon className={cn("size-4", archive.pending && "animate-spin")} />
    </Button>
  );
};
