"use client";

import { ChevronDown, Eye, EyeOff, FolderTree, Medal, Plus, Trophy } from "lucide-react";
import { useState, type FC } from "react";
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
import type { RecognitionBadge } from "~/core/ports/recognition";
import { RecognitionForm } from "../recognitionForm";
import { BadgeManagementDialog } from "../badgeManagementDialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";

interface Props {
  readonly categories: Array<CategoryView>;
  readonly groups: Array<TaskGroup>;
  readonly recipients: ReadonlyArray<{ id: string; displayName: string }>;
  readonly badges: ReadonlyArray<RecognitionBadge>;
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
  recipients,
  badges,
  search,
  showArchived,
  archivedCount,
  onManageCategories,
  onSearchChange,
  onToggleArchived,
  onCreate,
  onEdit,
}) => {
  const [recognitionMenuOpen, setRecognitionMenuOpen] = useState(false);
  const [recognitionDialogOpen, setRecognitionDialogOpen] = useState(false);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [badgeCatalog, setBadgeCatalog] = useState([...badges]);

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
        <div className="relative flex rounded-xl shadow-hard has-[>button:first-child:active]:translate-x-0.5 has-[>button:first-child:active]:translate-y-0.5 has-[>button:first-child:active]:shadow-hard-sm motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 motion-safe:ease-out">
          <Button
            className="h-11 min-h-11 rounded-r-none border-2 border-r-0 border-foreground shadow-none active:translate-x-0 active:translate-y-0 active:shadow-none max-sm:w-11 max-sm:px-0"
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
          <Popover open={recognitionMenuOpen} onOpenChange={setRecognitionMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                className="h-11 min-h-11 rounded-l-none border-2 border-foreground px-3 shadow-none transition-transform duration-100 active:translate-x-0 active:translate-y-0 active:scale-95 active:shadow-none"
                aria-label="More task actions"
                title="More task actions"
              >
                <ChevronDown
                  aria-hidden
                  className={`transition-transform duration-150 ${recognitionMenuOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="min-w-56">
              <button
                type="button"
                onClick={() => {
                  setRecognitionMenuOpen(false);
                  onManageCategories();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-muted"
              >
                <FolderTree aria-hidden /> Manage categories
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecognitionMenuOpen(false);
                  setRecognitionDialogOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-muted"
              >
                <Trophy aria-hidden /> Recognize a contribution
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecognitionMenuOpen(false);
                  setBadgeDialogOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-muted"
              >
                <Medal aria-hidden /> Manage badges
              </button>
            </PopoverContent>
          </Popover>
        </div>
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
            isItemDisabled={(task) => task.removed}
            renderItem={(task) => (
              <TaskRow
                title={task.title}
                policy={describeTaskPolicy(task.policy)}
                points={task.points}
                photoRequired={task.photoRequired}
                textRequired={task.textRequired}
                muted={task.archived || task.removed}
                disabled={task.removed}
                status={
                  task.removed ? (
                    <Badge variant="neutral">Removed</Badge>
                  ) : (
                    task.archived && <Badge>Archived</Badge>
                  )
                }
                aria-label={`Edit ${task.title}`}
                onClick={() => {
                  onEdit(task);
                }}
                action={task.removed ? null : <ArchiveTaskButton task={task} />}
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

      <Dialog open={recognitionDialogOpen} onOpenChange={setRecognitionDialogOpen}>
        <DialogContent className="max-h-[min(90dvh,850px)] max-w-2xl overflow-y-auto">
          <header className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-black">Recognize a contribution</DialogTitle>
              <DialogDescription className="mt-1">
                Publish recognition and award points to an eligible member.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="ghost">
                Close
              </Button>
            </DialogClose>
          </header>
          <RecognitionForm
            recipients={recipients}
            badges={badgeCatalog}
            onPublished={() => {
              setRecognitionDialogOpen(false);
            }}
            onBadgeCreated={(badge) => {
              setBadgeCatalog((current) =>
                [...current, badge].sort((a, b) => a.label.localeCompare(b.label)),
              );
            }}
          />
        </DialogContent>
      </Dialog>
      <BadgeManagementDialog
        open={badgeDialogOpen}
        badges={badgeCatalog}
        onOpenChange={setBadgeDialogOpen}
        onBadgeCreated={(badge) => {
          setBadgeCatalog((current) =>
            [...current, badge].sort((a, b) => a.label.localeCompare(b.label)),
          );
        }}
      />
    </Page>
  );
};
