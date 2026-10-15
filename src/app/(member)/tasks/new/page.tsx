import type { Metadata } from "next";
import type { FC } from "react";
import { OwnTaskForm } from "~/components/proof/ownTaskForm";
import { Page } from "~/components/ui/page";
import { categoryService, proofService } from "~/infra";
import { userCanAddOwnTask } from "~/domain/rules";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "Add your own task" };

const NewOwnTaskPage: FC = async () => {
  const user = await requireUser(userCanAddOwnTask);
  const [categories, reviewers] = await Promise.all([
    categoryService.listFeedCategories(user),
    proofService.listReviewers(user),
  ]);

  return (
    <Page
      title="Add your own task"
      description="Did something for the club that is not on the task list? Add it with your proof and an admin reviews it."
    >
      <OwnTaskForm categories={categories} reviewers={reviewers} />
    </Page>
  );
};

export default NewOwnTaskPage;
