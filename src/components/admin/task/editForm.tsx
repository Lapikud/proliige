"use client";

import type { FC } from "react";
import { updateTaskAction } from "~/actions/task";
import { updateTaskSchema } from "~/actions/task/schema";
import { useActionForm } from "~/lib/form";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { Form, FormActions, FormError } from "../../ui/form";
import type { CategoryView, TaskView } from "./model";
import { TaskFields } from "./fields";

interface Props {
  task: TaskView;
  categories: Array<CategoryView>;
  onDone: () => void;
}

export const EditTaskForm: FC<Props> = ({ task, categories, onDone }) => {
  const { form, submit, pending } = useActionForm(updateTaskSchema, updateTaskAction, {
    defaultValues: {
      taskId: task.id,
      task: {
        title: task.title,
        description: task.description,
        categoryId: task.categoryId,
        points: task.points,
        policy: task.policy,
        cooldownSeconds: task.cooldownSeconds ?? 86_400,
        photoRequired: task.photoRequired,
        photoInstructions: task.photoInstructions ?? "",
      },
    },
    onSuccess: onDone,
  });

  return (
    <Card>
      <CardContent>
        <Form form={form} onSubmit={submit}>
          <TaskFields categories={categories} />
          <FormError />
          <FormActions>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          </FormActions>
        </Form>
      </CardContent>
    </Card>
  );
};
