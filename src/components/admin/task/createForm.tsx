"use client";

import type { FC } from "react";
import { createTaskAction } from "~/actions/task";
import { createTaskSchema } from "~/actions/task/schema";
import { useActionForm } from "~/lib/form";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { Form, FormActions, FormError } from "../../ui/form";
import type { CategoryView } from "./model";
import { TaskFields, taskValues } from "./fields";

interface Props {
  categories: Array<CategoryView>;
  onDone: () => void;
}

export const CreateTaskForm: FC<Props> = ({ categories, onDone }) => {
  const { form, submit, pending } = useActionForm(createTaskSchema, createTaskAction, {
    defaultValues: { task: taskValues(categories) },
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
              {pending ? "Creating…" : "Create task"}
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
