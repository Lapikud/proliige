"use client";

import { useRouter } from "next/navigation";
import type { FC } from "react";
import { toast } from "sonner";
import { suggestTaskAction } from "~/actions/task";
import { createTaskSchema } from "~/actions/task/schema";
import type { Category } from "~/domain/task";
import { useActionForm } from "~/lib/form";
import { TaskFields, taskValues } from "../admin/task/fields";
import { Button } from "../ui/button";
import { Form, FormActions, FormError } from "../ui/form";

export const SuggestTaskForm: FC<{ categories: ReadonlyArray<Category> }> = ({ categories }) => {
  const router = useRouter();
  const { form, submit, pending } = useActionForm(createTaskSchema, suggestTaskAction, {
    defaultValues: { task: taskValues([...categories]) },
    onSuccess: () => {
      toast.success("Thanks! An admin will look at your suggestion.");
      router.push("/");
    },
  });

  return (
    <Form
      form={form}
      onSubmit={submit}
      className="gap-5 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <TaskFields categories={[...categories]} />
      <FormError />
      <FormActions className="justify-end border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send suggestion"}
        </Button>
      </FormActions>
    </Form>
  );
};
