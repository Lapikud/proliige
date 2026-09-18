import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitEventHandler, useState, useTransition } from "react";
import { type DefaultValues, type FieldValues, type Path, useForm } from "react-hook-form";
import type { z } from "zod";
import type { ActionResult } from "./action";

type ServerAction<Input, Result> = (input: Input) => Promise<ActionResult<Result>>;

interface ActionFormOptions<Values, Result> {
  readonly defaultValues: DefaultValues<Values>;
  readonly onSuccess?: (data: Result) => void;
}

export function useActionForm<Input extends FieldValues, Output extends FieldValues, Result>(
  schema: z.ZodType<Output, Input>,
  action: ServerAction<Input, Result>,
  { defaultValues, onSuccess }: ActionFormOptions<Input, Result>,
) {
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const [pending, startTransition] = useTransition();

  const send = form.handleSubmit(() => {
    startTransition(async () => {
      const result = await action(form.getValues());
      if (result.ok) {
        onSuccess?.(result.data);

        return;
      }
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(name as Path<Input>, { message });
      }
      form.setError("root.server", { message: result.error });
    });
  });

  const submit: SubmitEventHandler<HTMLFormElement> = (event) => {
    void send(event);
  };

  return {
    form,
    submit,
    pending,
  };
}

interface ActionOptions<Input, Result> {
  readonly onSuccess?: (data: Result, input: Input) => void;
  readonly onError?: (message: string, input: Input) => void;
}

export function useAction<Input, Result>(
  action: ServerAction<Input, Result>,
  { onSuccess, onError }: ActionOptions<Input, Result> = {},
) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (input: Input) => {
    setError(null);
    startTransition(async () => {
      const result = await action(input);
      if (result.ok) {
        onSuccess?.(result.data, input);

        return;
      }
      setError(result.error);
      onError?.(result.error, input);
    });
  };

  return {
    run,
    pending,
    error,
  };
}
