import { Camera, ChevronLeft, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type FC, cache } from "react";
import { ProofPanel } from "~/components/proof/panel";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { proofService, taskService } from "~/infra";
import { describeCooldown, describeTaskPolicy, describeUnavailability } from "~/lib/taskLabels";
import { formatDateTime } from "~/lib/utils";
import { userCanBrowseTasks } from "~/domain/rules";
import { requireUser } from "~/lib/user";

const loadTask = cache(async (taskId: string) =>
  taskService.getTask(await requireUser(userCanBrowseTasks), taskId),
);

export async function generateMetadata({
  params,
}: PageProps<"/tasks/[taskId]">): Promise<Metadata> {
  const item = await loadTask((await params).taskId);

  return { title: item?.task.title ?? "Task" };
}

const TaskPage: FC<PageProps<"/tasks/[taskId]">> = async ({ params }) => {
  const { taskId } = await params;
  const user = await requireUser(userCanBrowseTasks);
  const [item, reviewers] = await Promise.all([loadTask(taskId), proofService.listReviewers(user)]);
  if (!item) {
    notFound();
  }

  const { task, categoryName } = item;
  const cooldown = describeCooldown(task.cooldownSeconds);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/tasks"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Tasks
        </Link>
        <Badge variant="points" className="px-3 py-1 text-sm tabular-nums">
          {task.points} pts
        </Badge>
      </div>

      <header className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-card sm:p-6">
        <p className="text-sm text-muted-foreground">{categoryName}</p>
        <h1 className="mt-1 font-heading text-xl font-bold tracking-wide break-words uppercase sm:text-3xl">
          {task.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>{describeTaskPolicy(task.policy)}</Badge>
          {cooldown && <Badge>every {cooldown}</Badge>}
          {task.photoRequired && (
            <Badge>
              <Camera className="size-3.5" aria-hidden />
              photo required
            </Badge>
          )}
          {task.textRequired && (
            <Badge>
              <PenLine className="size-3.5" aria-hidden />
              written answer
            </Badge>
          )}
        </div>
      </header>
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
        points={task.points}
        photoRequired={task.photoRequired}
        photoInstructions={task.photoInstructions}
        textRequired={task.textRequired}
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
    </div>
  );
};

export default TaskPage;
