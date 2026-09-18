import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { FC } from "react";
import { LoginForm } from "~/components/auth/loginForm";
import { Card, CardContent } from "~/components/ui/card";
import { startPageFor } from "~/lib/navigation";
import { getUser } from "~/lib/user";

export const metadata: Metadata = {
  title: "Sign in",
  robots: {
    index: false,
  },
};

const LoginPage: FC = async () => {
  const user = await getUser();
  if (user) {
    redirect(startPageFor(user));
  }

  return (
    <Card className="mx-auto w-full max-w-sm overflow-hidden">
      <header className="flex flex-col gap-1 bg-ink px-6 pt-7 pb-6 text-white">
        <h1 className="font-heading text-2xl font-bold tracking-wide uppercase">Sign in</h1>
        <p className="text-sm text-white/75">Use your Lapikud FreeIPA account.</p>
      </header>
      <div aria-hidden="true" className="h-1.5 bg-stripes" />
      <CardContent className="p-6">
        <LoginForm />
      </CardContent>
    </Card>
  );
};

export default LoginPage;
