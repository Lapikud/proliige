"use client";

import type { FC } from "react";
import { updateCategoryAction } from "~/actions/category";
import { updateCategorySchema } from "~/actions/category/schema";
import { useActionForm } from "~/lib/form";
import { Button } from "../../ui/button";
import { Field, Form, FormError } from "../../ui/form";
import { Input } from "../../ui/formControls";
import type { CategoryRowView } from "./model";

interface Props {
  category: CategoryRowView;
  onDone: () => void;
}

export const EditCategoryForm: FC<Props> = ({ category, onDone }) => {
  const { form, submit, pending } = useActionForm(updateCategorySchema, updateCategoryAction, {
    defaultValues: {
      categoryId: category.id,
      category: { name: category.name },
    },
    onSuccess: onDone,
  });

  return (
    <Form form={form} onSubmit={submit} className="flex-1 flex-row flex-wrap items-end gap-2">
      <Field name="category.name" label="Category name" hideLabel className="min-w-48 flex-1">
        {(control) => <Input {...control} />}
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
      <FormError />
    </Form>
  );
};
