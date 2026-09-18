import type { Metadata } from "next";
import type { FC } from "react";
import type { TaskView } from "~/components/admin/task/model";
import { TaskManager } from "~/components/admin/task/manager";
import type { Task } from "~/domain/task";
import { taskService, categoryService } from "~/infra";
import { userCanManageTasks } from "~/domain/rules";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "Manage tasks" };

const toTaskView = ({ task, categoryName }: { task: Task; categoryName: string }): TaskView => ({
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
  archived: task.archivedAt !== null,
});

const AdminTasksPage: FC = async () => {
  const user = await requireUser(userCanManageTasks);
  const [tasks, categories] = await Promise.all([
    taskService.listAllTasks(user),
    categoryService.listCategories(user),
  ]);

  return <TaskManager tasks={tasks.map(toTaskView)} categories={categories} />;
};

export default AdminTasksPage;
