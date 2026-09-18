"use client";

import type { FC } from "react";
import { rejectProofAction } from "~/actions/review";
import { rejectSchema } from "~/actions/review/schema";
import { useActionForm } from "~/lib/form";
import { Button } from "../ui/button";
import { Field, Form, FormActions, FormError } from "../ui/form";
import { Input } from "../ui/formControls";

interface Props {
  proofId: string;
  onRejected: () => void;
  onCancel: () => void;
}

export const RejectForm: FC<Props> = ({ proofId, onRejected, onCancel }) => {
  const { form, submit, pending } = useActionForm(rejectSchema, rejectProofAction, {
    defaultValues: {
      proofId,
      reason: "",
    },
    onSuccess: onRejected,
  });

  return (
    <Form form={form} onSubmit={submit}>
      <Field name="reason" label="Reason (optional)">
        {(control) => <Input placeholder="Tell them what was missing" autoFocus {...control} />}
      </Field>
      <FormError />
      <FormActions>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Rejecting…" : "Confirm rejection"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </FormActions>
    </Form>
  );
};
