"use client";

import { type FC, useEffect } from "react";
import { createTaskAction, updateTaskAction } from "~/actions/task";
import { createTaskSchema } from "~/actions/task/schema";
import { useActionForm } from "~/lib/form";
import { Button } from "../../ui/button";
import { Form, FormActions, FormError } from "../../ui/form";
import type { CategoryView, TaskView } from "./model";
import { TaskFields, taskValues } from "./fields";

interface Props {
  readonly categories: Array<CategoryView>;
  readonly task: TaskView | undefined;
  readonly categoryId: string | undefined;
  readonly onDone: () => void;
  readonly onCancel: () => void;
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onPendingChange: (pending: boolean) => void;
}

export const TaskForm: FC<Props> = ({
  categories,
  task,
  categoryId,
  onDone,
  onCancel,
  onDirtyChange,
  onPendingChange,
}) => {
  const { form, submit, pending } = useActionForm(
    createTaskSchema,
    (values) =>
      task
        ? updateTaskAction({
            taskId: task.id,
            ...values,
          })
        : createTaskAction(values),
    {
      defaultValues: { task: taskValues(categories, task, categoryId) },
      onSuccess: onDone,
    },
  );

  useEffect(() => {
    onDirtyChange(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);
  useEffect(() => {
    onPendingChange(pending);
  }, [onPendingChange, pending]);

  let submitLabel = task ? "Save changes" : "Create task";
  if (pending) submitLabel = task ? "Saving…" : "Creating…";

  return (
    <Form form={form} onSubmit={submit} className="gap-0">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <TaskFields categories={categories} />
        <FormError />
      </div>
      <FormActions className="sticky bottom-0 z-10 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onCancel();
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </FormActions>
    </Form>
  );
};
