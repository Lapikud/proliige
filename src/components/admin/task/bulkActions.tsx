"use client";

import { Archive, ArchiveRestore, FolderInput, LoaderCircle, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { moveTasksAction, setTasksArchivedAction, undoMoveTasksAction } from "~/actions/task";
import type { ActionResult } from "~/lib/action";
import { useAction } from "~/lib/form";
import { Button } from "../../ui/button";
import { ErrorState } from "../../ui/feedback";
import { Select } from "../../ui/formControls";
import type { CategoryView, TaskView } from "./model";

interface Props {
  readonly tasks: Array<TaskView>;
  readonly categories: Array<CategoryView>;
  readonly categoryId: string;
  readonly onDone: () => void;
}

const count = (n: number) => `${n} ${n === 1 ? "task" : "tasks"}`;

export function undoToast(
  message: string,
  undo: () => Promise<ActionResult<unknown>>,
  undone: string,
) {
  toast(message, {
    duration: 10_000,
    action: {
      label: "Undo",
      onClick: () => {
        undo().then(
          (result) => {
            if (result.ok) toast.success(undone);
            else toast.error(result.error);
          },
          () => {
            toast.error("Could not undo. Please refresh and try again.");
          },
        );
      },
    },
  });
}

function BusyIcon({ icon: Icon, busy }: { readonly icon: LucideIcon; readonly busy: boolean }) {
  return busy ? (
    <LoaderCircle className="size-4 animate-spin" aria-hidden />
  ) : (
    <Icon className="size-4" aria-hidden />
  );
}

export function TaskBulkActions({ tasks, categories, categoryId, onDone }: Props) {
  const [destinationId, setDestinationId] = useState("");
  const activeIds = tasks.filter(({ archived }) => !archived).map(({ id }) => id);
  const archivedIds = tasks.filter(({ archived }) => archived).map(({ id }) => id);

  const move = useAction(moveTasksAction, {
    onSuccess: (moves) => {
      onDone();
      if (moves.length === 0) return;
      undoToast(
        `Moved ${count(moves.length)}.`,
        () => undoMoveTasksAction({ moves }),
        `Moved ${count(moves.length)} back.`,
      );
    },
  });
  const archive = useAction(setTasksArchivedAction, {
    onSuccess: (changedIds) => {
      onDone();
      if (changedIds.length === 0) return;
      undoToast(
        `Archived ${count(changedIds.length)}.`,
        () =>
          setTasksArchivedAction({
            taskIds: changedIds,
            archived: false,
          }),
        `Reactivated ${count(changedIds.length)}.`,
      );
    },
  });
  const reactivate = useAction(setTasksArchivedAction, {
    onSuccess: (changedIds) => {
      onDone();
      if (changedIds.length > 0) toast.success(`Reactivated ${count(changedIds.length)}.`);
    },
  });
  const pending = move.pending || archive.pending || reactivate.pending;
  const error = move.error ?? archive.error ?? reactivate.error;

  return (
    <>
      <label htmlFor={`move-${categoryId}`} className="sr-only">
        Move selected tasks to category
      </label>
      <Select
        id={`move-${categoryId}`}
        value={destinationId}
        onChange={(event) => {
          setDestinationId(event.target.value);
        }}
        disabled={pending}
        className="h-9 w-auto min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <option value="">Move to…</option>
        {categories
          .filter(({ id }) => id !== categoryId)
          .map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
      </Select>
      <Button
        size="sm"
        variant="solid"
        className="w-9 px-0"
        aria-label="Move selected tasks"
        title="Move selected tasks"
        disabled={pending || destinationId === ""}
        onClick={() => {
          move.run({
            taskIds: tasks.map(({ id }) => id),
            categoryId: destinationId,
          });
        }}
      >
        <BusyIcon icon={FolderInput} busy={move.pending} />
      </Button>
      {activeIds.length > 0 && (
        <Button
          size="sm"
          variant="solid"
          aria-label={`Archive ${count(activeIds.length)}`}
          title={`Archive ${count(activeIds.length)}`}
          disabled={pending}
          onClick={() => {
            archive.run({
              taskIds: activeIds,
              archived: true,
            });
          }}
        >
          <BusyIcon icon={Archive} busy={archive.pending} />
          <span className="tabular-nums">{activeIds.length}</span>
        </Button>
      )}
      {archivedIds.length > 0 && (
        <Button
          size="sm"
          variant="solid"
          aria-label={`Reactivate ${count(archivedIds.length)}`}
          title={`Reactivate ${count(archivedIds.length)}`}
          disabled={pending}
          onClick={() => {
            reactivate.run({
              taskIds: archivedIds,
              archived: false,
            });
          }}
        >
          <BusyIcon icon={ArchiveRestore} busy={reactivate.pending} />
          <span className="tabular-nums">{archivedIds.length}</span>
        </Button>
      )}
      {error && (
        <div className="w-full">
          <ErrorState description={error} />
        </div>
      )}
    </>
  );
}
