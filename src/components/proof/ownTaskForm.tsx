"use client";

import { useRouter } from "next/navigation";
import { type FC, useState } from "react";
import { addOwnTaskAction } from "~/actions/proof";
import { ownTaskSchema } from "~/actions/proof/schema";
import type { Category } from "~/domain/task";
import type { PublicUserView } from "~/domain/user";
import { useActionForm } from "~/lib/form";
import { Button } from "../ui/button";
import { Input, Select, Textarea } from "../ui/formControls";
import { Field, Form, FormActions, FormError } from "../ui/form";
import { ReviewerPicker } from "./form";
import { PhotoPicker } from "./photoPicker";

interface Props {
  categories: ReadonlyArray<Category>;
  reviewers: ReadonlyArray<PublicUserView>;
}

export const OwnTaskForm: FC<Props> = ({ categories, reviewers }) => {
  const router = useRouter();
  const [proofRef] = useState(() => crypto.randomUUID());
  const { form, submit, pending } = useActionForm(ownTaskSchema, addOwnTaskAction, {
    defaultValues: {
      title: "",
      description: "",
      categoryId: categories[0]?.id ?? "",
      points: 5,
      objectKeys: [],
      reviewerIds: [],
    },
    onSuccess: () => {
      router.push("/proofs");
    },
  });

  return (
    <Form
      form={form}
      onSubmit={submit}
      className="gap-5 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <Field name="title" label="What did you do?">
        {(control) => <Input maxLength={120} {...control} />}
      </Field>
      <Field name="description" label="Details" hint="Optional. When, where, who helped.">
        {(control) => <Textarea rows={4} maxLength={2000} {...control} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="categoryId" label="Category">
          {(control) => (
            <Select {...control}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          name="points"
          label="Points you suggest"
          hint="The reviewer may change it."
          options={{ valueAsNumber: true }}
        >
          {(control) => <Input type="number" min={0} step={1} {...control} />}
        </Field>
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-bold">
          Photos <span className="font-normal text-muted-foreground">· optional</span>
        </h3>
        <PhotoPicker proofRef={proofRef} instructions={null} />
      </section>
      {reviewers.length > 0 && <ReviewerPicker reviewers={reviewers} />}
      <FormError />
      <FormActions className="justify-end border-t border-border pt-4">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending ? "Sending…" : "Submit for review"}
        </Button>
      </FormActions>
    </Form>
  );
};
