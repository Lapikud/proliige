"use client";

import type { FC } from "react";
import { unapproveProofAction } from "~/actions/review";
import { unapproveSchema } from "~/actions/review/schema";
import { useActionForm } from "~/lib/form";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { Field, Form, FormActions, FormError } from "../ui/form";
import { Textarea } from "../ui/formControls";

interface Props {
  proofId: string;
  taskTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  points: number;
}

export const UnapproveDialog: FC<Props> = ({
  proofId,
  taskTitle,
  points,
  open,
  onOpenChange,
  onDone,
}) => {
  const { form, submit, pending } = useActionForm(unapproveSchema, unapproveProofAction, {
    defaultValues: {
      proofId,
      reason: "",
    },
    onSuccess: onDone,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-bold">Unapprove post?</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          &ldquo;{taskTitle}&rdquo; leaves the feed and its {points} points are taken back. The
          pixel is told why.
        </DialogDescription>
        <Form form={form} onSubmit={submit} className="mt-4">
          <Field name="reason" label="Reason (optional)">
            {(control) => <Textarea rows={3} maxLength={300} autoFocus {...control} />}
          </Field>
          <FormError />
          <FormActions className="justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Unapproving…" : "Unapprove"}
            </Button>
          </FormActions>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
