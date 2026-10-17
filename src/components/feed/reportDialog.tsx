"use client";

import type { FC } from "react";
import { reportPostAction } from "~/actions/feed";
import { reportSchema } from "~/actions/feed/schema";
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
}

export const ReportDialog: FC<Props> = ({ proofId, taskTitle, open, onOpenChange, onDone }) => {
  const { form, submit, pending } = useActionForm(reportSchema, reportPostAction, {
    defaultValues: {
      proofId,
      reason: "",
    },
    onSuccess: () => {
      form.reset();
      onDone();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-bold">Report post?</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          An admin will look at &ldquo;{taskTitle}&rdquo; and decide whether it stays on the feed.
        </DialogDescription>
        <Form form={form} onSubmit={submit} className="mt-4">
          <Field name="reason" label="What is wrong with it?">
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
              {pending ? "Reporting…" : "Report"}
            </Button>
          </FormActions>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
