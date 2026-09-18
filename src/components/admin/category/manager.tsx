"use client";

import Link from "next/link";
import { type FC, useState } from "react";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { EmptyState } from "../../ui/feedback";
import { Page } from "../../ui/page";
import { CreateCategoryForm } from "./createForm";
import { EditCategoryForm } from "./editForm";
import type { CategoryRowView } from "./model";

interface Props {
  categories: Array<CategoryRowView>;
}

export const CategoryManager: FC<Props> = ({ categories }) => {
  const [renaming, setRenaming] = useState<string | null>(null);
  const stopRenaming = () => {
    setRenaming(null);
  };

  return (
    <Page
      title="Categories"
      description={
        <>
          Every task belongs to one category.{" "}
          <Link href="/admin/tasks" className="text-brand-ink underline">
            Manage tasks
          </Link>
        </>
      }
    >
      <Card>
        <CardContent>
          <CreateCategoryForm />
        </CardContent>
      </Card>

      {categories.length === 0 && (
        <EmptyState
          title="No categories yet"
          description="Add one above, then you can create tasks."
        />
      )}

      <ul className="flex list-none flex-col gap-2 p-0">
        {categories.map((category) => (
          <li key={category.id}>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                {renaming === category.id ? (
                  <EditCategoryForm category={category} onDone={stopRenaming} />
                ) : (
                  <CategoryRow
                    category={category}
                    onRename={() => {
                      setRenaming(category.id);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
};

interface CategoryRowProps {
  category: CategoryRowView;
  onRename: () => void;
}

const CategoryRow: FC<CategoryRowProps> = ({ category, onRename }) => (
  <>
    <div className="flex flex-col">
      <span className="text-sm font-medium text-foreground">{category.name}</span>
      <span className="text-xs text-muted-foreground">{category.slug}</span>
    </div>
    <Button size="sm" variant="outline" onClick={onRename}>
      Rename
    </Button>
  </>
);
