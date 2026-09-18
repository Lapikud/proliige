import type { Metadata } from "next";
import type { FC } from "react";
import { CategoryManager } from "~/components/admin/category/manager";
import { categoryService } from "~/infra";
import { userCanManageCategories } from "~/domain/rules";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "Categories" };

const AdminCategoriesPage: FC = async () => {
  const categories = await categoryService.listCategories(
    await requireUser(userCanManageCategories),
  );

  return <CategoryManager categories={categories} />;
};

export default AdminCategoriesPage;
