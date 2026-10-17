import type { Metadata } from "next";
import type { FC } from "react";
import { SuggestTaskForm } from "~/components/task/suggestForm";
import { Page } from "~/components/ui/page";
import { userCanSuggestTasks } from "~/domain/rules";
import { categoryService } from "~/infra";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "Suggest a task" };

const SuggestTaskPage: FC = async () => {
  const user = await requireUser(userCanSuggestTasks);
  const categories = await categoryService.listFeedCategories(user);

  return (
    <Page
      title="Suggest a task"
      description="Have an idea for something pixels could do for the club? An admin reviews it before it goes on the task list."
    >
      <SuggestTaskForm categories={categories} />
    </Page>
  );
};

export default SuggestTaskPage;
