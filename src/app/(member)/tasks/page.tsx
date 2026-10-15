import type { Metadata } from "next";
import type { FC } from "react";
import { TaskList } from "~/components/task/list";
import { Page } from "~/components/ui/page";
import { taskService } from "~/infra";
import { describeTaskPolicy, taskAvailability } from "~/lib/taskLabels";
import { formatDate } from "~/lib/utils";
import { userCanBrowseTasks } from "~/domain/rules";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "Tasks" };

const TasksPage: FC = async () => {
  const items = await taskService.listOpenTasks(await requireUser(userCanBrowseTasks));
  const now = new Date();
  const tasks = items.map((item) => ({
    id: item.task.id,
    title: item.task.title,
    description: item.task.description,
    categoryId: item.task.categoryId,
    categoryName: item.categoryName,
    points: item.task.points,
    policy: describeTaskPolicy(item.task.policy),
    photoRequired: item.task.photoRequired,
    availability: taskAvailability(item, now),
    cooldownUntil: item.userCooldownUntil && formatDate(item.userCooldownUntil),
  }));
  const open = tasks.filter((task) => task.availability === "open").length;

  return (
    <Page
      title="Tasks"
      description={`${open} available to you now. Do one, submit proof, and a reviewer approves it for points.`}
    >
      <TaskList tasks={tasks} />
    </Page>
  );
};

export default TasksPage;
