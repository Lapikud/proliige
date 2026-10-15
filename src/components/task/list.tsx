"use client";

import { Check, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { type FC, useState } from "react";
import type { TaskAvailability } from "~/lib/taskLabels";
import { GroupAccordionItem } from "../ui/accordion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/feedback";
import { CategoryTitle } from "./categoryTitle";
import { TaskGroups } from "./groups";
import { TaskRow } from "./row";
import { matchesTaskSearch } from "./search";
import { TaskToolbar } from "./toolbar";

export interface BrowsableTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly points: number;
  readonly policy: string;
  readonly photoRequired: boolean;
  readonly availability: TaskAvailability;
  readonly cooldownUntil: string | null;
}

const rank: Record<TaskAvailability, number> = {
  open: 0,
  pending: 1,
  cooldown: 2,
  taken: 2,
  done: 3,
};

export const TaskList: FC<{ readonly tasks: ReadonlyArray<BrowsableTask> }> = ({ tasks }) => {
  const [search, setSearch] = useState("");
  const groups = Map.groupBy(
    tasks.filter((task) => matchesTaskSearch(task, search)),
    (task) => task.categoryId,
  );

  if (tasks.length === 0) {
    return (
      <EmptyState title="No open tasks" description="Check back once the board has added some.">
        <Button asChild variant="outline">
          <Link href="/proofs">See my proofs</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <>
      <TaskToolbar label="Find tasks" search={search} onSearchChange={setSearch} />

      <TaskGroups
        groupIds={[...groups.keys()]}
        search={search}
        onClearSearch={() => {
          setSearch("");
        }}
      >
        {[...groups].map(([categoryId, group]) => (
          <GroupAccordionItem
            key={categoryId}
            value={categoryId}
            title={<CategoryTitle name={group[0]?.categoryName ?? ""} count={group.length} />}
          >
            <ul className="list-none px-2 py-1">
              {group
                .toSorted((a, b) => rank[a.availability] - rank[b.availability])
                .map((task) => (
                  <li key={task.id} className="border-b border-border/70 py-1 last:border-b-0">
                    <TaskRow
                      href={`/tasks/${task.id}`}
                      title={task.title}
                      policy={task.policy}
                      points={task.points}
                      photoRequired={task.photoRequired}
                      muted={task.availability !== "open"}
                      status={<AvailabilityBadge task={task} />}
                    />
                  </li>
                ))}
            </ul>
          </GroupAccordionItem>
        ))}
      </TaskGroups>
    </>
  );
};

const AvailabilityBadge: FC<{ readonly task: BrowsableTask }> = ({ task }) => {
  switch (task.availability) {
    case "pending":
      return (
        <Badge variant="pending">
          <Clock className="size-3.5" aria-hidden />
          Awaiting review
        </Badge>
      );
    case "done":
      return (
        <Badge variant="approved">
          <Check className="size-3.5" aria-hidden />
          Done
        </Badge>
      );
    case "taken":
      return (
        <Badge>
          <Lock className="size-3.5" aria-hidden />
          Taken
        </Badge>
      );
    case "cooldown":
      return (
        <Badge>
          <Clock className="size-3.5" aria-hidden />
          Again on {task.cooldownUntil}
        </Badge>
      );
    case "open":
      return null;
  }
};
