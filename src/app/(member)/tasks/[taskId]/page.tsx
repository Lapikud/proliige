import { notFound } from "next/navigation";
import type { FC } from "react";
import { ProofPanel } from "~/components/proof/panel";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Page } from "~/components/ui/page";
import { proofService, taskService } from "~/infra";
import { describeCooldown, describeTaskPolicy, describeUnavailability } from "~/lib/taskLabels";
import { formatDateTime } from "~/lib/utils";
import { userCanBrowseTasks } from "~/domain/rules";
import { requireUser } from "~/lib/user";

const TaskPage: FC<PageProps<"/tasks/[taskId]">> = async ({ params }) => {
  const { taskId } = await params;
  const user = await requireUser(userCanBrowseTasks);
  const [item, reviewers] = await Promise.all([
    taskService.getTask(user, taskId),
    proofService.listReviewers(user),
  ]);
  if (!item) {
    notFound();
  }

  const { task, categoryName } = item;
  const cooldown = describeCooldown(task.cooldownSeconds);
  const details = [categoryName, describeTaskPolicy(task.policy), cooldown && `every ${cooldown}`];

  return (
    <Page
      title={task.title}
      description={details.filter(Boolean).join(" · ")}
      actions={
        <Badge variant="points" className="px-3 py-1 text-sm tabular-nums">
          {task.points} pts
        </Badge>
      }
    >
      {task.description && (
        <Card>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
              {task.description}
            </p>
          </CardContent>
        </Card>
      )}
      <ProofPanel
        taskId={task.id}
        photoRequired={task.photoRequired}
        photoInstructions={task.photoInstructions}
        reviewers={reviewers}
        status={item.userProofStatus}
        unavailable={describeUnavailability(
          {
            archived: task.archivedAt !== null,
            takenByAnother: item.takenByAnother,
            cooldownUntil: item.userCooldownUntil,
            now: new Date(),
          },
          formatDateTime,
        )}
      />
    </Page>
  );
};

export default TaskPage;
