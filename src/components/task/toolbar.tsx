"use client";

import { Search } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Input } from "../ui/formControls";

interface TaskToolbarProps {
  readonly label: string;
  readonly search: string;
  readonly onSearchChange: (search: string) => void;
  readonly searchDisabled?: boolean;
  readonly children?: ReactNode;
}

export const TaskToolbar: FC<TaskToolbarProps> = ({
  label,
  search,
  onSearchChange,
  searchDisabled = false,
  children,
}) => (
  // top-17.5 / md:top-19 sit right under the sticky navbar (h-16 + stripe, md:h-[76px]).
  <section
    aria-label={label}
    className="sticky top-17.5 z-30 -mx-1 flex items-center gap-2 border-b border-border bg-background px-1 py-3 md:top-19"
  >
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
        disabled={searchDisabled}
        onChange={(event) => {
          onSearchChange(event.target.value);
        }}
        placeholder="Search tasks"
        className="pl-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
    </div>
    {children}
  </section>
);
