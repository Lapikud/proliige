import Link from "next/link";
import { type FC } from "react";

export const SignInPrompt: FC = () => (
  <p className="text-sm text-muted-foreground">
    <Link href="/login" className="text-brand-ink underline">
      Sign in
    </Link>{" "}
    to like or comment.
  </p>
);
