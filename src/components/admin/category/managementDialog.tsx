"use client";

import { type FC, useState } from "react";
import { deleteCategoryAction } from "~/actions/category";
import { useAction } from "~/lib/form";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../ui/dialog";
import { EmptyState, ErrorState } from "../../ui/feedback";
import { CreateCategoryForm } from "./createForm";
import { EditCategoryForm } from "./editForm";
import type { CategoryView, TaskView } from "../task/model";

interface Props {
  readonly open: boolean;
  readonly categories: Array<CategoryView>;
  readonly tasks: Array<TaskView>;
  readonly onOpenChange: (open: boolean) => void;
}

export const CategoryManagementDialog: FC<Props> = ({ open, categories, tasks, onOpenChange }) => {
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setRenaming(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto p-0">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold text-card-foreground">
              Manage categories
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Create, rename, or remove the groups used to organize tasks.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button type="button" size="sm" variant="ghost">
              Close
            </Button>
          </DialogClose>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <section aria-labelledby="new-category-heading" className="space-y-3">
            <h3 id="new-category-heading" className="font-semibold text-foreground">
              Add category
            </h3>
            <CreateCategoryForm />
          </section>

          <section aria-labelledby="category-list-heading" className="space-y-3">
            <h3 id="category-list-heading" className="font-semibold text-foreground">
              Categories{" "}
              <span className="text-sm font-medium text-muted-foreground">
                · {categories.length}
              </span>
            </h3>
            {categories.length === 0 ? (
              <EmptyState
                title="No categories yet"
                description="Add a category above to organize your tasks."
              />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    taskCount={tasks.filter((task) => task.categoryId === category.id).length}
                    renaming={renaming === category.id}
                    onRename={() => {
                      setRenaming(category.id);
                    }}
                    onRenameDone={() => {
                      setRenaming(null);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CategoryRowProps {
  readonly category: CategoryView;
  readonly taskCount: number;
  readonly renaming: boolean;
  readonly onRename: () => void;
  readonly onRenameDone: () => void;
}

const CategoryRow: FC<CategoryRowProps> = ({
  category,
  taskCount,
  renaming,
  onRename,
  onRenameDone,
}) => {
  const [confirming, setConfirming] = useState(false);
  const remove = useAction(deleteCategoryAction, {
    onError: () => {
      setConfirming(false);
    },
  });

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-4">
      {renaming ? (
        <EditCategoryForm category={category} onDone={onRenameDone} />
      ) : (
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{category.name}</p>
          <p className="text-xs text-muted-foreground">
            {category.slug} · {taskCount} total {taskCount === 1 ? "task" : "tasks"} (archived
            included)
          </p>
          {taskCount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Move all tasks, including archived ones, before deleting this category.
            </p>
          )}
        </div>
      )}

      {!renaming && (
        <div className="flex flex-wrap items-center gap-2">
          {confirming ? (
            <>
              <Button
                size="sm"
                variant="danger"
                disabled={remove.pending || taskCount > 0}
                onClick={() => {
                  remove.run({ categoryId: category.id });
                }}
              >
                {remove.pending ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={remove.pending}
                onClick={() => {
                  setConfirming(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onRename}>
                Rename
              </Button>
              <Button
                size="sm"
                variant="subtle"
                disabled={taskCount > 0}
                onClick={() => {
                  setConfirming(true);
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      )}

      {remove.error && (
        <div className="w-full">
          <ErrorState title="Could not delete category" description={remove.error} />
        </div>
      )}
    </li>
  );
};
