import type { Metadata } from "next";
import Link from "next/link";
import type { FC } from "react";
import { ProofStatusBadge } from "~/components/proof/statusBadge";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/feedback";
import { Page } from "~/components/ui/page";
import { taskService } from "~/infra";
import { describeTaskPolicy } from "~/lib/taskLabels";
import { userCanBrowseTasks } from "~/domain/rules";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "Tasks" };

const TasksPage: FC = async () => {
  const items = await taskService.listOpenTasks(await requireUser(userCanBrowseTasks));

  return (
    <Page title="Tasks" description="Do one, submit proof, and a reviewer approves it for points.">
      {items.length === 0 && (
        <EmptyState title="No open tasks" description="Check back once the board has added some." />
      )}
      <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
        {items.map(({ task, categoryName, userProofStatus, takenByAnother }) => (
          <li key={task.id}>
            <Card className="relative h-full transition-transform hover:-translate-y-0.5">
              <CardContent className="flex h-full items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-base font-black text-foreground after:absolute after:inset-0 after:rounded-2xl hover:text-brand-ink"
                  >
                    {task.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {categoryName} · {describeTaskPolicy(task.policy)}
                    {task.photoRequired && " · photo required"}
                  </p>
                  {userProofStatus && <ProofStatusBadge status={userProofStatus} />}
                  {!userProofStatus && takenByAnother && <Badge>Taken by someone else</Badge>}
                </div>
                <Badge variant="points" className="shrink-0 tabular-nums">
                  {task.points} pts
                </Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
};

export default TasksPage;
