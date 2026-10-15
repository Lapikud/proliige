"use client";

import { type FC, type ReactNode, useState } from "react";
import { Accordion } from "../ui/accordion";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/feedback";

interface Props {
  readonly groupIds: ReadonlyArray<string>;
  readonly search: string;
  readonly onClearSearch: () => void;
  readonly children: ReactNode;
}

export const TaskGroups: FC<Props> = ({ groupIds, search, onClearSearch, children }) => {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());

  if (search.trim() !== "" && groupIds.length === 0) {
    return (
      <EmptyState
        title="No tasks match your search"
        description="Try another word, or clear the search to see every task."
      >
        <Button variant="outline" onClick={onClearSearch}>
          Clear search
        </Button>
      </EmptyState>
    );
  }

  return (
    <Accordion
      type="multiple"
      className="flex flex-col gap-4"
      value={groupIds.filter((id) => !collapsed.has(id))}
      onValueChange={(open) => {
        setCollapsed(new Set(groupIds.filter((id) => !open.includes(id))));
      }}
    >
      {children}
    </Accordion>
  );
};
