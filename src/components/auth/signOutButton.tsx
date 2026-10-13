"use client";

import type { ComponentProps, FC } from "react";
import { logoutAction } from "~/actions/auth";
import { useAction } from "~/lib/form";
import { forgetThisBrowser } from "../notifications/desktop";
import { Button } from "../ui/button";

export const SignOutButton: FC<{
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
}> = ({ className, variant }) => {
  const { run, pending } = useAction(logoutAction);

  return (
    <Button
      size="sm"
      variant={variant ?? "ghost"}
      className={className}
      disabled={pending}
      onClick={() => {
        void forgetThisBrowser()
          .catch(() => undefined)
          .finally(() => {
            run({});
          });
      }}
    >
      Sign out
    </Button>
  );
};
