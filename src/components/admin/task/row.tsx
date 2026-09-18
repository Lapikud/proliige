"use client";

import type { FC } from "react";
import { archiveTaskAction } from "~/actions/task";
import { useAction } from "~/lib/form";
import { describeTaskPolicy } from "~/lib/taskLabels";
import { cn } from "~/lib/utils";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { ErrorState } from "../../ui/feedback";
import type { TaskView } from "./model";

interface Props {
  task: TaskView;
  onEdit: () => void;
}

export const TaskRow: FC<Props> = ({ task, onEdit }) => {
  const archive = useAction(archiveTaskAction);

  return (
    <Card className={cn(task.archived && "opacity-60")}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">{task.title}</h2>
            <p className="text-sm text-muted-foreground">
              {task.categoryName} · {describeTaskPolicy(task.policy)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {task.photoRequired && <Badge variant="brand">Photo required</Badge>}
              {task.archived && <Badge>Archived</Badge>}
            </div>
          </div>
          <Badge variant="points" className="tabular-nums">
            {task.points} pts
          </Badge>
        </div>

        {archive.error && <ErrorState description={archive.error} />}

        <div className="flex flex-wrap items-end gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="subtle"
            size="sm"
            disabled={archive.pending}
            onClick={() => {
              archive.run({
                taskId: task.id,
                archived: !task.archived,
              });
            }}
          >
            {task.archived ? "Reactivate" : "Archive"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
