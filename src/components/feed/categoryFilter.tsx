import Link from "next/link";
import type { FC } from "react";
import type { Category } from "~/domain/task";
import { cn } from "~/lib/utils";

interface Props {
  categories: ReadonlyArray<Category>;
  current: string | null;
  keep?: Record<string, string>;
}

export const CategoryFilter: FC<Props> = ({ categories, current, keep = {} }) => {
  if (categories.length < 2) {
    return null;
  }
  const href = (category: string | null) => {
    const params = new URLSearchParams({
      ...keep,
      ...(category ? { category } : {}),
    }).toString();

    return params ? `/?${params}` : "/";
  };
  const options = [
    {
      id: null,
      name: "All",
    },
    ...categories,
  ];

  return (
    <nav aria-label="Filter by category">
      <ul className="flex [scrollbar-width:none] list-none gap-2 overflow-x-auto p-0 pb-1">
        {options.map(({ id, name }) => {
          const active = id === current;

          return (
            <li key={id ?? "all"} className="shrink-0">
              <Link
                href={href(id)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full border-2 px-3.5 text-sm font-bold",
                  active
                    ? "border-foreground bg-primary text-primary-foreground shadow-hard-sm"
                    : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground",
                )}
              >
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
