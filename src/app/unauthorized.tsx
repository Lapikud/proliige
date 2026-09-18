import type { FC } from "react";
import { LoginForm } from "~/components/auth/loginForm";
import { StatusPage } from "~/components/ui/feedback";

const Unauthorized: FC = () => (
  <StatusPage
    code="401"
    title="Sign in to continue"
    description="Use your Lapikud FreeIPA account."
  >
    <div className="w-full">
      <LoginForm />
    </div>
  </StatusPage>
);

export default Unauthorized;
