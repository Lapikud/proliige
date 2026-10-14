"use client";

import { Eye, EyeOff, Plus, Search, Tags } from "lucide-react";
import { type FC, useState } from "react";
import { Accordion } from "../../ui/accordion";
import { Button } from "../../ui/button";
import { EmptyState, Notice } from "../../ui/feedback";
import { Input } from "../../ui/formControls";
import { Page } from "../../ui/page";
import { SelectableAccordion } from "../../ui/selectableAccordion";
import { TaskBulkActions } from "./bulkActions";
import type { CategoryView, TaskView } from "./model";
import { TaskRow } from "./row";
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
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

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

      {/* top-17.5 / md:top-19 sit right under the sticky navbar (h-16 + stripe, md:h-[76px]). */}
      <section
        aria-label="Task tools"
        className="sticky top-17.5 z-30 flex flex-col gap-2 border-b-2 border-foreground bg-background py-3 md:top-19"
      >
        <div className="flex items-center gap-2">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="task-search"
              type="search"
              value={search}
              disabled={categories.length === 0}
              onChange={(event) => {
                onSearchChange(event.target.value);
              }}
              placeholder="Search tasks"
              className="pl-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>
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
        </div>

        {groups.length > 0 && (
          <nav
            aria-label="Jump to category"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
          >
            {groups.map(({ category, tasks }) => (
              <a
                key={category.id}
                href={`#category-${category.slug}`}
                className="inline-flex min-h-9 shrink-0 items-center rounded-full border-2 border-foreground bg-card px-3 text-sm font-semibold whitespace-nowrap text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {category.name} <span className="ml-1.5 tabular-nums">{tasks.length}</span>
              </a>
            ))}
          </nav>
        )}
      </section>

      {search.trim() !== "" && groups.length === 0 && (
        <EmptyState
          title="No tasks match your search"
          description="Try another title or description, or clear the search to browse every category."
        >
          <Button
            variant="outline"
            onClick={() => {
              onSearchChange("");
            }}
          >
            Clear search
          </Button>
        </EmptyState>
      )}

      <Accordion
        type="multiple"
        className="flex flex-col gap-4"
        value={groups.map(({ category }) => category.id).filter((id) => !collapsed.has(id))}
        onValueChange={(open) => {
          setCollapsed(
            new Set(groups.map(({ category }) => category.id).filter((id) => !open.includes(id))),
          );
        }}
      >
        {groups.map(({ category, tasks }) => (
          <SelectableAccordion
            key={category.id}
            value={category.id}
            id={`category-${category.slug}`}
            // Clears the sticky navbar plus the sticky task tools when jumping to a category.
            className="scroll-mt-48"
            label={category.name}
            title={
              <span className="min-w-0 truncate text-lg">
                {category.name}{" "}
                <span className="text-sm font-medium text-white/75 tabular-nums">
                  · {tasks.length}
                </span>
              </span>
            }
            items={tasks}
            itemLabel={(task) => task.title}
            renderItem={(task) => (
              <TaskRow
                task={task}
                onEdit={() => {
                  onEdit(task);
                }}
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
                  : "No active tasks in this category."}
              </p>
            }
          />
        ))}
      </Accordion>
    </Page>
  );
};
