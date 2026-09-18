"use client";

import { clsx } from "clsx";
import { type FC, type ReactNode, type SubmitEventHandler, useId } from "react";
import {
  FormProvider,
  type RegisterOptions,
  type UseFormRegisterReturn,
  type UseFormReturn,
  useFormContext,
} from "react-hook-form";
import { cn } from "~/lib/utils";
import { ErrorState } from "./feedback";
import { Label } from "./formControls";

export type ControlProps = UseFormRegisterReturn & {
  readonly id: string;
  readonly "aria-invalid": boolean;
  readonly "aria-describedby": string | undefined;
};

interface FormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any, any, any>;
  onSubmit: SubmitEventHandler<HTMLFormElement>;
  className?: string;
  children: ReactNode;
}

export const Form: FC<FormProps> = ({ form, onSubmit, className, children }) => (
  <FormProvider {...form}>
    <form noValidate onSubmit={onSubmit} className={cn("flex flex-col gap-4", className)}>
      {children}
    </form>
  </FormProvider>
);

interface FieldProps {
  name: string;
  label: string;
  hint?: string;
  hideLabel?: boolean;
  inline?: boolean;
  options?: RegisterOptions;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}

export const Field: FC<FieldProps> = ({
  name,
  label,
  hint,
  hideLabel = false,
  inline = false,
  options,
  className,
  children,
}) => {
  const { register, getFieldState, formState } = useFormContext();
  const { error } = getFieldState(name, formState);
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const control: ControlProps = {
    ...register(name, options),
    id,
    "aria-invalid": error !== undefined,
    "aria-describedby": clsx(hint && hintId, error && errorId) || undefined,
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        inline && "flex-row-reverse items-center justify-end gap-2",
        className,
      )}
    >
      <Label htmlFor={id} className={cn(hideLabel && "sr-only")}>
        {label}
      </Label>
      {children(control)}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error?.message && (
        <p id={errorId} className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
};

export const FormError: FC = () => {
  const { formState } = useFormContext();
  const message = formState.errors.root?.server?.message;
  if (!message) {
    return null;
  }

  return <ErrorState description={message} />;
};

interface FormActionsProps {
  className?: string;
  children: ReactNode;
}

export const FormActions: FC<FormActionsProps> = ({ className, children }) => (
  <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
);
