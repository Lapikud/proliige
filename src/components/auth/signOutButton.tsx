"use client";

import type { FC } from "react";
import { logoutAction } from "~/actions/auth";
import { useAction } from "~/lib/form";
import { forgetThisBrowser } from "../notifications/desktop";
import { Button } from "../ui/button";

export const SignOutButton: FC<{ className?: string }> = ({ className }) => {
  const { run, pending } = useAction(logoutAction);

  return (
    <Button
      size="sm"
      variant="ghost"
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
