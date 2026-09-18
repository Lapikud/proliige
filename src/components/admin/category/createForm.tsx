"use client";

import type { FC } from "react";
import { createCategoryAction } from "~/actions/category";
import { createCategorySchema } from "~/actions/category/schema";
import { useActionForm } from "~/lib/form";
import { Button } from "../../ui/button";
import { Field, Form, FormError } from "../../ui/form";
import { Input } from "../../ui/formControls";

const defaultValues = {
  category: { name: "" },
};

export const CreateCategoryForm: FC = () => {
  const { form, submit, pending } = useActionForm(createCategorySchema, createCategoryAction, {
    defaultValues,
    onSuccess: () => {
      form.reset(defaultValues);
    },
  });

  return (
    <Form form={form} onSubmit={submit} className="flex-row flex-wrap items-start gap-2">
      <Field name="category.name" label="New category" hideLabel className="min-w-48 flex-1">
        {(control) => <Input placeholder="New category" {...control} />}
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
      <FormError />
    </Form>
  );
};
