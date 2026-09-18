"use client";

import type { FC } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { TaskValues } from "~/actions/task/schema";
import { completionPolicy } from "~/domain/completionPolicy";
import { taskPolicies } from "~/domain/task";
import { describeTaskPolicy } from "~/lib/taskLabels";
import { Field } from "../../ui/form";
import { Checkbox, Input, Select, Textarea } from "../../ui/formControls";
import type { CategoryView } from "./model";

interface Props {
  categories: Array<CategoryView>;
}

export const TaskFields: FC<Props> = ({ categories }) => {
  const { control } = useFormContext<{ task: TaskValues }>();
  const [policy, photoRequired] = useWatch({
    control,
    name: ["task.policy", "task.photoRequired"],
  });

  return (
    <>
      <Field name="task.title" label="Title">
        {(control) => <Input {...control} />}
      </Field>
      <Field name="task.description" label="Description">
        {(control) => <Textarea rows={3} {...control} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="task.categoryId" label="Category">
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
        <Field name="task.points" label="Points" options={{ valueAsNumber: true }}>
          {(control) => <Input type="number" min={0} step={1} {...control} />}
        </Field>
        <Field name="task.policy" label="Completion policy">
          {(control) => (
            <Select {...control}>
              {taskPolicies.map((value) => (
                <option key={value} value={value}>
                  {describeTaskPolicy(value)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {completionPolicy(policy).usesCooldown && (
          <Field
            name="task.cooldownSeconds"
            label="Cooldown (seconds)"
            hint="Measured from the user's last approved proof."
            options={{ valueAsNumber: true }}
          >
            {(control) => <Input type="number" min={0} step={1} {...control} />}
          </Field>
        )}
      </div>

      <Field name="task.photoRequired" label="Require photos" inline>
        {(control) => <Checkbox {...control} />}
      </Field>
      {photoRequired && (
        <Field name="task.photoInstructions" label="Instructions shown to the user">
          {(control) => <Input placeholder="Upload a photo of the sorted recycling" {...control} />}
        </Field>
      )}
    </>
  );
};

export function taskValues(categories: Array<CategoryView>): TaskValues {
  return {
    title: "",
    description: "",
    categoryId: categories[0]?.id ?? "",
    points: 5,
    policy: "one_per_user",
    cooldownSeconds: 86_400,
    photoRequired: false,
    photoInstructions: "",
  };
}
