"use client";

import { Eye, EyeOff, Plus, Tags } from "lucide-react";
import type { FC } from "react";
import { Button } from "../../ui/button";
import { Notice } from "../../ui/feedback";
import { Page } from "../../ui/page";
import { SelectableAccordion } from "../../ui/selectableAccordion";
import { CategoryTitle } from "../../task/categoryTitle";
import { TaskGroups } from "../../task/groups";
import { TaskToolbar } from "../../task/toolbar";
import { TaskBulkActions } from "./bulkActions";
import type { CategoryView, TaskView } from "./model";
import { TaskRow } from "../../task/row";
import { ArchiveTaskButton } from "./archiveButton";
import { Badge } from "../../ui/badge";
import { describeTaskPolicy } from "~/lib/taskLabels";
import type { TaskGroup } from "./workspaceState";

interface Props {
  readonly categories: Array<CategoryView>;
  readonly groups: Array<TaskGroup>;
  readonly search: string;
  readonly showArchived: boolean;
  readonly archivedCount: number;
  readonly onManageCategories: () => void;
  readonly onSearchChange: (search: string) => void;
  readonly onToggleArchived: () => void;
  readonly onCreate: (categoryId?: string) => void;
  readonly onEdit: (task: TaskView) => void;
}

export const TaskWorkspaceView: FC<Props> = ({
  categories,
  groups,
  search,
  showArchived,
  archivedCount,
  onManageCategories,
  onSearchChange,
  onToggleArchived,
  onCreate,
  onEdit,
}) => {
  return (
    <Page
      title="Manage tasks"
      description="Tasks grouped by category. Select tasks to move or archive them together."
    >
      {categories.length === 0 && (
        <Notice>
          Every task needs a category.{" "}
          <button type="button" onClick={onManageCategories} className="text-brand-ink underline">
            Create one first.
          </button>
        </Notice>
      )}

      <TaskToolbar
        label="Task tools"
        search={search}
        onSearchChange={onSearchChange}
        searchDisabled={categories.length === 0}
      >
        {archivedCount > 0 && (
          <Button
            variant="outline"
            className="max-sm:w-11 max-sm:px-0"
            aria-pressed={showArchived}
            aria-label={
              showArchived ? "Hide archived tasks" : `Show ${archivedCount} archived tasks`
            }
            title={showArchived ? "Hide archived tasks" : `Show ${archivedCount} archived tasks`}
            onClick={onToggleArchived}
          >
            {showArchived ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            <span className="hidden sm:inline">Archived ({archivedCount})</span>
          </Button>
        )}
        <Button
          variant="outline"
          className="max-sm:w-11 max-sm:px-0"
          aria-label="Manage categories"
          title="Manage categories"
          onClick={onManageCategories}
        >
          <Tags aria-hidden />
          <span className="hidden sm:inline">Categories</span>
        </Button>
        <Button
          className="max-sm:w-11 max-sm:px-0"
          aria-label="New task"
          title="New task"
          onClick={() => {
            onCreate();
          }}
          disabled={categories.length === 0}
        >
          <Plus aria-hidden />
          <span className="hidden sm:inline">New task</span>
        </Button>
      </TaskToolbar>

      <TaskGroups
        groupIds={groups.map(({ category }) => category.id)}
        search={search}
        onClearSearch={() => {
          onSearchChange("");
        }}
      >
        {groups.map(({ category, tasks }) => (
          <SelectableAccordion
            key={category.id}
            value={category.id}
            label={category.name}
            title={<CategoryTitle name={category.name} count={tasks.length} />}
            items={tasks}
            itemLabel={(task) => task.title}
            renderItem={(task) => (
              <TaskRow
                title={task.title}
                policy={describeTaskPolicy(task.policy)}
                points={task.points}
                photoRequired={task.photoRequired}
                textRequired={task.textRequired}
                muted={task.archived}
                status={task.archived && <Badge>Archived</Badge>}
                aria-label={`Edit ${task.title}`}
                onClick={() => {
                  onEdit(task);
                }}
                action={<ArchiveTaskButton task={task} />}
              />
            )}
            actions={(selected, clear) => (
              <TaskBulkActions
                tasks={selected}
                categories={categories}
                categoryId={category.id}
                onDone={clear}
              />
            )}
            headerAction={
              <Button
                size="sm"
                variant="ghost"
                className="w-9 px-0"
                aria-label={`Add task to ${category.name}`}
                title={`Add task to ${category.name}`}
                onClick={() => {
                  onCreate(category.id);
                }}
              >
                <Plus className="size-4" aria-hidden />
              </Button>
            }
            empty={
              <p className="py-3 text-sm text-muted-foreground">
                {showArchived
                  ? "No tasks in this category yet."
                  : "No active tasks in this category."}{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0"
                  onClick={() => {
                    onCreate(category.id);
                  }}
                >
                  Add a task
                </Button>
              </p>
            }
          />
        ))}
      </TaskGroups>
    </Page>
  );
};
