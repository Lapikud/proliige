"use client";

import { ChevronDown } from "lucide-react";
import { type FC, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { submitProofAction } from "~/actions/proof";
import { proofSchema } from "~/actions/proof/schema";
import type { PublicUserView } from "~/domain/user";
import { useActionForm } from "~/lib/form";
import { UserAvatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/formControls";
import { Form, FormActions, FormError } from "../ui/form";
import { PhotoPicker } from "./photoPicker";

interface Props {
  taskId: string;
  points: number;
  photoRequired: boolean;
  photoInstructions: string | null;
  reviewers: ReadonlyArray<PublicUserView>;
  onSubmitted: () => void;
}

export const ProofForm: FC<Props> = ({
  taskId,
  points,
  photoRequired,
  photoInstructions,
  reviewers,
  onSubmitted,
}) => {
  const [proofRef] = useState(() => crypto.randomUUID());
  const { form, submit, pending } = useActionForm(proofSchema, submitProofAction, {
    defaultValues: {
      taskId,
      objectKeys: [],
      reviewerIds: [],
    },
    onSuccess: onSubmitted,
  });
  const objectKeys = useWatch({
    control: form.control,
    name: "objectKeys",
  });
  const missingPhotos = photoRequired && objectKeys.length === 0;

  return (
    <Form
      form={form}
      onSubmit={submit}
      className="gap-5 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <h2 className="text-lg font-bold">Submit proof</h2>
      {photoRequired && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-bold">
            Photos{" "}
            <span className="font-normal text-muted-foreground">· at least one required</span>
          </h3>
          <PhotoPicker proofRef={proofRef} instructions={photoInstructions} />
        </section>
      )}
      {reviewers.length > 0 && <ReviewerPicker reviewers={reviewers} />}
      <FormError />
      <FormActions className="justify-end border-t border-border pt-4">
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={pending || missingPhotos}
        >
          {pending ? "Submitting…" : `Submit for ${points} pts`}
        </Button>
      </FormActions>
    </Form>
  );
};

const ReviewerPicker: FC<{ reviewers: ReadonlyArray<PublicUserView> }> = ({ reviewers }) => {
  const { register } = useFormContext<{ reviewerIds: Array<string> }>();

  return (
    <details className="group rounded-xl border border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
        Notify a reviewer
        <span className="font-normal text-muted-foreground">· optional</span>
        <ChevronDown
          className="ml-auto size-4 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <fieldset className="flex flex-col gap-2 border-t border-border px-3 py-2">
        <legend className="sr-only">Reviewers</legend>
        <p className="text-xs text-muted-foreground">
          The people you pick are notified; either way it waits in the review queue.
        </p>
        <ul className="flex list-none flex-col gap-1 p-0">
          {reviewers.map((reviewer) => (
            <li key={reviewer.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2 text-sm font-bold hover:bg-muted has-checked:bg-brand-soft">
                <Checkbox value={reviewer.id} {...register("reviewerIds")} />
                <UserAvatar name={reviewer.displayName} />
                {reviewer.displayName}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </details>
  );
};
