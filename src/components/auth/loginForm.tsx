"use client";

import type { FC } from "react";
import { loginAction } from "~/actions/auth";
import { loginSchema } from "~/actions/auth/schema";
import { useActionForm } from "~/lib/form";
import { Button } from "../ui/button";
import { Field, Form, FormError } from "../ui/form";
import { Input } from "../ui/formControls";

export const LoginForm: FC = () => {
  const { form, submit, pending } = useActionForm(loginSchema, loginAction, {
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <Form form={form} onSubmit={submit}>
      <Field name="username" label="Username">
        {(control) => <Input autoComplete="username" autoFocus {...control} />}
      </Field>
      <Field name="password" label="Password">
        {(control) => <Input type="password" autoComplete="current-password" {...control} />}
      </Field>
      <FormError />
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </Form>
  );
};
