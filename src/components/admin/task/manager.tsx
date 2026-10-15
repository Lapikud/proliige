"use client";

import { useSearchParams } from "next/navigation";
import { type FC, useEffect, useMemo, useState } from "react";
import type { CategoryView, TaskView } from "./model";
import { CategoryManagementDialog } from "../category/managementDialog";
import { type TaskDialog, TaskEditorDialog } from "./taskEditorDialog";
import { TaskWorkspaceView } from "./workspaceView";
import { groupWorkspaceTasks } from "./workspaceState";

interface Props {
  readonly tasks: Array<TaskView>;
  readonly categories: Array<CategoryView>;
}

export const TaskManager: FC<Props> = ({ tasks, categories }) => {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [showArchived, setShowArchived] = useState(() => searchParams.get("archived") === "1");
  const [dialog, setDialog] = useState<TaskDialog | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(
    () => searchParams.get("categories") === "1",
  );
  const groups = useMemo(
    () => groupWorkspaceTasks(tasks, categories, search, showArchived),
    [categories, tasks, search, showArchived],
  );
  const archivedCount = tasks.filter((task) => task.archived).length;
  const editedTask =
    dialog?.kind === "edit" ? tasks.find(({ id }) => id === dialog.taskId) : undefined;

  // Native replaceState keeps the URL shareable without a server round trip (Next syncs it with useSearchParams).
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      if (search) url.searchParams.set("search", search);
      else url.searchParams.delete("search");
      if (showArchived) url.searchParams.set("archived", "1");
      else url.searchParams.delete("archived");
      // The nav link opens the dialog once; a reload should not reopen it.
      url.searchParams.delete("categories");
      window.history.replaceState(null, "", url);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [search, showArchived]);

  return (
    <>
      <TaskWorkspaceView
        categories={categories}
        groups={groups}
        search={search}
        showArchived={showArchived}
        archivedCount={archivedCount}
        onManageCategories={() => {
          setCategoryDialogOpen(true);
        }}
        onSearchChange={setSearch}
        onToggleArchived={() => {
          setShowArchived((current) => !current);
        }}
        onCreate={(categoryId) => {
          setDialog({
            kind: "create",
            categoryId,
          });
        }}
        onEdit={(task) => {
          setDialog({
            kind: "edit",
            taskId: task.id,
          });
        }}
      />
      <CategoryManagementDialog
        open={categoryDialogOpen}
        categories={categories}
        tasks={tasks}
        onOpenChange={setCategoryDialogOpen}
      />
      <TaskEditorDialog
        dialog={dialog}
        task={editedTask}
        categories={categories}
        onClose={() => {
          setDialog(null);
        }}
      />
    </>
  );
};
