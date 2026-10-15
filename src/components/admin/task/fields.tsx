"use client";

import type { FC } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { TaskValues } from "~/actions/task/schema";
import { completionPolicy } from "~/domain/completionPolicy";
import { taskPolicies } from "~/domain/task";
import { describeTaskPolicy } from "~/lib/taskLabels";
import { Field } from "../../ui/form";
import { Checkbox, Input, Select, Textarea } from "../../ui/formControls";
import type { CategoryView, TaskView } from "./model";

interface Props {
  readonly categories: Array<CategoryView>;
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

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Field name="task.photoRequired" label="Require photos" inline>
          {(control) => <Checkbox {...control} />}
        </Field>
        <Field name="task.textRequired" label="Require a written answer" inline>
          {(control) => <Checkbox {...control} />}
        </Field>
      </div>
      {photoRequired && (
        <Field name="task.photoInstructions" label="Instructions shown to the user">
          {(control) => <Input placeholder="Upload a photo of the sorted recycling" {...control} />}
        </Field>
      )}
    </>
  );
};

export function taskValues(
  categories: Array<CategoryView>,
  task?: TaskView,
  categoryId?: string,
): TaskValues {
  if (task) {
    return {
      title: task.title,
      description: task.description,
      categoryId: task.categoryId,
      points: task.points,
      policy: task.policy,
      cooldownSeconds: task.cooldownSeconds ?? 86_400,
      photoRequired: task.photoRequired,
      photoInstructions: task.photoInstructions ?? "",
      textRequired: task.textRequired,
    };
  }

  return {
    title: "",
    description: "",
    categoryId: categoryId ?? categories[0]?.id ?? "",
    points: 5,
    policy: "one_per_user",
    cooldownSeconds: 86_400,
    photoRequired: false,
    photoInstructions: "",
    textRequired: false,
  };
}
