"use client";

import Link from "next/link";
import { type FC, useState } from "react";
import { Button } from "../../ui/button";
import { EmptyState, Notice } from "../../ui/feedback";
import { Page } from "../../ui/page";
import type { CategoryView, TaskView } from "./model";
import { TaskRow } from "./row";
import { type TaskDialog, TaskEditorDialog } from "./taskEditorDialog";

interface Props {
  tasks: Array<TaskView>;
  categories: Array<CategoryView>;
}

export const TaskManager: FC<Props> = ({ tasks, categories }) => {
  const [dialog, setDialog] = useState<TaskDialog | null>(null);
  const hasCategories = categories.length > 0;

  return (
    <Page
      title="Manage tasks"
      description="Create tasks, set their points and completion policy, and archive what is finished."
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/categories">Categories</Link>
          </Button>
          <Button
            onClick={() => {
              setDialog({
                kind: "create",
                categoryId: undefined,
              });
            }}
            disabled={!hasCategories}
          >
            New task
          </Button>
        </div>
      }
    >
      {!hasCategories && (
        <Notice>
          Every task needs a category.{" "}
          <Link href="/admin/categories" className="text-brand-ink underline">
            Create one first.
          </Link>
        </Notice>
      )}

      {tasks.length === 0 && (
        <EmptyState title="No tasks yet" description="Create the first one above." />
      )}

      <ul className="flex list-none flex-col gap-3 p-0">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskRow
              task={task}
              onEdit={() => {
                setDialog({
                  kind: "edit",
                  taskId: task.id,
                });
              }}
            />
          </li>
        ))}
      </ul>

      <TaskEditorDialog
        dialog={dialog}
        task={dialog?.kind === "edit" ? tasks.find(({ id }) => id === dialog.taskId) : undefined}
        categories={categories}
        onClose={() => {
          setDialog(null);
        }}
      />
    </Page>
  );
};
