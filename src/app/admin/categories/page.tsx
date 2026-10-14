import { redirect } from "next/navigation";

export default function AdminCategoriesPage() {
  redirect("/admin/tasks?categories=1");
}
