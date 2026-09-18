"use client";

import { type FC, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { submitProofAction } from "~/actions/proof";
import { proofSchema } from "~/actions/proof/schema";
import type { PublicUserView } from "~/domain/user";
import { useActionForm } from "~/lib/form";
import { UserAvatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/formControls";
import { Form, FormActions, FormError } from "../ui/form";
import { PhotoPicker } from "./photoPicker";

interface Props {
  taskId: string;
  photoRequired: boolean;
  photoInstructions: string | null;
  reviewers: ReadonlyArray<PublicUserView>;
  onSubmitted: () => void;
}

export const ProofForm: FC<Props> = ({
  taskId,
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
    <Form form={form} onSubmit={submit} className="gap-4">
      {photoRequired && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-base font-black">Photos</h2>
            <PhotoPicker proofRef={proofRef} instructions={photoInstructions} />
          </CardContent>
        </Card>
      )}
      {reviewers.length > 0 && (
        <Card>
          <CardContent>
            <ReviewerPicker reviewers={reviewers} />
          </CardContent>
        </Card>
      )}
      <FormError />
      <FormActions className="flex-col items-stretch">
        <Button type="submit" size="lg" className="w-full" disabled={pending || missingPhotos}>
          {pending ? "Submitting…" : "Submit proof"}
        </Button>
        {missingPhotos && (
          <p className="text-center text-sm text-muted-foreground">
            Attach at least one photo first.
          </p>
        )}
      </FormActions>
    </Form>
  );
};

const ReviewerPicker: FC<{ reviewers: ReadonlyArray<PublicUserView> }> = ({ reviewers }) => {
  const { register } = useFormContext<{ reviewerIds: Array<string> }>();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-base font-black text-foreground">Reviewers</legend>
      <p className="text-xs text-muted-foreground">
        Optional. The people you pick are notified; either way it waits in the review queue.
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
  );
};
