"use client";

import Link from "next/link";
import { type FC, useState } from "react";
import { Button } from "../../ui/button";
import { EmptyState, Notice } from "../../ui/feedback";
import { Page } from "../../ui/page";
import type { CategoryView, TaskView } from "./model";
import { CreateTaskForm } from "./createForm";
import { EditTaskForm } from "./editForm";
import { TaskRow } from "./row";

interface Props {
  tasks: Array<TaskView>;
  categories: Array<CategoryView>;
}

type Editing = TaskView | "new" | null;

export const TaskManager: FC<Props> = ({ tasks, categories }) => {
  const [editing, setEditing] = useState<Editing>(null);
  const hasCategories = categories.length > 0;
  const close = () => {
    setEditing(null);
  };

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
              setEditing("new");
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

      {editing === "new" && <CreateTaskForm categories={categories} onDone={close} />}
      {editing !== null && editing !== "new" && (
        <EditTaskForm key={editing.id} task={editing} categories={categories} onDone={close} />
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
                setEditing(task);
              }}
            />
          </li>
        ))}
      </ul>
    </Page>
  );
};
