"use client";

import { type FC, useCallback, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../ui/dialog";
import { EmptyState } from "../../ui/feedback";
import type { CategoryView, TaskView } from "./model";
import { TaskForm } from "./taskForm";

export type TaskDialog =
  { kind: "create"; categoryId: string | undefined } | { kind: "edit"; taskId: string };

interface Props {
  readonly dialog: TaskDialog | null;
  readonly task: TaskView | undefined;
  readonly categories: Array<CategoryView>;
  readonly onClose: () => void;
}

export const TaskEditorDialog: FC<Props> = ({ dialog, task, categories, onClose }) => {
  const dirty = useRef(false);
  const [pending, setPending] = useState(false);
  const onDirtyChange = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  const close = () => {
    if (pending) return;
    if (dirty.current && !window.confirm("Discard your unsaved task changes?")) return;
    dirty.current = false;
    onClose();
  };
  const saved = () => {
    dirty.current = false;
    setPending(false);
    onClose();
  };

  return (
    <Dialog
      open={dialog !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="fixed inset-0 top-0 left-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-card p-0 text-card-foreground shadow-none outline-none md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(90dvh,900px)] md:w-[min(44rem,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-border md:shadow-card">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {dialog?.kind === "create" ? "New task" : "Edit task"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Set the task details, points, category, and completion policy.
            </DialogDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={close}
            disabled={pending}
            aria-label="Close task editor"
          >
            Close
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {dialog?.kind === "edit" && !task ? (
            <EmptyState title="Task not found" description="This task may have been removed." />
          ) : (
            dialog && (
              <TaskForm
                key={task?.id ?? "new"}
                task={task}
                categoryId={dialog.kind === "create" ? dialog.categoryId : undefined}
                categories={categories}
                onDone={saved}
                onCancel={close}
                onDirtyChange={onDirtyChange}
                onPendingChange={setPending}
              />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
