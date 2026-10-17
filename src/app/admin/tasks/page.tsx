import type { Metadata } from "next";
import type { FC } from "react";
import type { TaskView } from "~/components/admin/task/model";
import { TaskManager } from "~/components/admin/task/manager";
import type { Task } from "~/domain/task";
import { taskService, categoryService, recognitionService } from "~/infra";
import { userCanManageTasks } from "~/domain/rules";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "Manage tasks" };

const toTaskView = ({
  task,
  categoryName,
  suggestedByName,
}: {
  task: Task;
  categoryName: string;
  suggestedByName: string | null;
}): TaskView => ({
  id: task.id,
  title: task.title,
  description: task.description,
  categoryId: task.categoryId,
  categoryName,
  points: task.points,
  policy: task.policy,
  cooldownSeconds: task.cooldownSeconds,
  photoRequired: task.photoRequired,
  photoInstructions: task.photoInstructions,
  textRequired: task.textRequired,
  archived: task.archivedAt !== null,
  removed: task.removedAt !== null,
  suggestedBy: suggestedByName,
  suggestionPending: task.suggestionPending,
});

const AdminTasksPage: FC = async () => {
  const user = await requireUser(userCanManageTasks);
  const [tasks, categories, eligibleRecipients, badges] = await Promise.all([
    taskService.listAllTasks(user),
    categoryService.listCategories(user),
    recognitionService.listEligibleRecipients(user),
    recognitionService.listBadges(user),
  ]);
  const recipients = eligibleRecipients.filter(({ id }) => id !== user.id);

  return (
    <TaskManager
      tasks={tasks.map(toTaskView)}
      categories={categories}
      recipients={recipients}
      badges={badges}
    />
  );
};

export default AdminTasksPage;
