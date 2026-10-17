"use client";

import type { FC } from "react";
import { useWatch } from "react-hook-form";
import { addCommentAction } from "~/actions/feed";
import { commentSchema } from "~/actions/feed/schema";
import { feedConfig } from "~/config/feed";
import { useActionForm } from "~/lib/form";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Field, Form, FormActions, FormError } from "../ui/form";
import { Textarea } from "../ui/formControls";
import type { CommentView } from "./model";

interface Props {
  proofId: string;
  onPosted: (comment: CommentView) => void;
  compact?: boolean;
}

export const CommentForm: FC<Props> = ({ proofId, onPosted, compact = false }) => {
  const defaultValues = {
    proofId,
    body: "",
  };
  const { form, submit, pending } = useActionForm(commentSchema, addCommentAction, {
    defaultValues,
    onSuccess: (comment) => {
      onPosted(comment);
      form.reset(defaultValues);
    },
  });
  const body = useWatch({
    control: form.control,
    name: "body",
  });

  return (
    <Form form={form} onSubmit={submit} className="gap-2">
      <Field name="body" label="Add a comment" hideLabel>
        {(control) => (
          <Textarea
            rows={compact ? 1 : 2}
            className={cn(compact && "field-sizing-content max-h-32 min-h-11 resize-none")}
            maxLength={feedConfig.maxCommentLength}
            placeholder="Say something kind…"
            {...control}
          />
        )}
      </Field>
      <FormError />
      <FormActions className="justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {(!compact || body.trim().length > feedConfig.maxCommentLength * 0.8) &&
            `${body.trim().length}/${feedConfig.maxCommentLength}`}
        </span>
        <Button type="submit" size="sm" disabled={pending || (compact && !body.trim())}>
          Post comment
        </Button>
      </FormActions>
    </Form>
  );
};
