"use client";

import { Archive, ArchiveRestore, Camera, LoaderCircle } from "lucide-react";
import type { FC } from "react";
import { archiveTaskAction } from "~/actions/task";
import { useAction } from "~/lib/form";
import { describeTaskPolicy } from "~/lib/taskLabels";
import { cn } from "~/lib/utils";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ErrorState } from "../../ui/feedback";
import { undoToast } from "./bulkActions";
import type { TaskView } from "./model";

interface Props {
  readonly task: TaskView;
  readonly onEdit: () => void;
}

export const TaskRow: FC<Props> = ({ task, onEdit }) => {
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
  });
  const archiveLabel = `${task.archived ? "Reactivate" : "Archive"} ${task.title}`;
  let ArchiveIcon = task.archived ? ArchiveRestore : Archive;
  if (archive.pending) ArchiveIcon = LoaderCircle;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-12 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`Edit ${task.title}`}
        >
          <span
            className={cn(
              "min-w-0 flex-1 font-semibold break-words",
              task.archived ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {task.title}
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {task.photoRequired && (
              <Badge variant="brand" title="Photo required">
                <Camera className="size-3.5" aria-hidden />
                <span className="sr-only">Photo required</span>
              </Badge>
            )}
            {task.archived && <Badge>Archived</Badge>}
            <span className="text-sm text-muted-foreground">{describeTaskPolicy(task.policy)}</span>
            <Badge variant="points" className="tabular-nums">
              {task.points} pts
            </Badge>
          </span>
        </button>
        <Button
          variant="subtle"
          size="sm"
          className="w-9 shrink-0 px-0"
          aria-label={archiveLabel}
          title={archiveLabel}
          disabled={archive.pending}
          onClick={() => {
            archive.run({
              taskId: task.id,
              archived: !task.archived,
            });
          }}
        >
          <ArchiveIcon className={cn("size-4", archive.pending && "animate-spin")} />
        </Button>
      </div>
      {archive.error && <ErrorState description={archive.error} />}
    </div>
  );
};
