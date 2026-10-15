"use client";

import { Check, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { type FC, type ReactNode, useState } from "react";
import type { ProofStatus } from "~/domain/proof";
import type { PublicUserView } from "~/domain/user";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { ProofForm } from "./form";

interface Props {
  taskId: string;
  points: number;
  photoRequired: boolean;
  photoInstructions: string | null;
  reviewers: ReadonlyArray<PublicUserView>;
  status: ProofStatus | null;
  unavailable: string | null;
}

export const ProofPanel: FC<Props> = ({ status, unavailable, ...form }) => {
  const [submitted, setSubmitted] = useState(false);

  if (submitted || status === "pending") {
    return (
      <StatePanel
        icon={<Clock aria-hidden />}
        title="Awaiting review"
        className="bg-brand-soft"
        action={{
          href: "/proofs",
          label: "See my proofs",
        }}
      >
        You will be notified either way. My proofs shows who is reviewing it.
      </StatePanel>
    );
  }
  if (status === "approved") {
    return (
      <StatePanel
        icon={<Check aria-hidden />}
        title={`Done, +${form.points} pts`}
        className="bg-success-soft"
        action={{
          href: "/tasks",
          label: "Browse open tasks",
        }}
      >
        Your points have been awarded.
      </StatePanel>
    );
  }
  if (unavailable) {
    return (
      <StatePanel
        icon={<Lock aria-hidden />}
        title="Not available right now"
        action={{
          href: "/tasks",
          label: "Browse open tasks",
        }}
      >
        {unavailable}
      </StatePanel>
    );
  }

  return (
    <ProofForm
      {...form}
      onSubmitted={() => {
        setSubmitted(true);
      }}
    />
  );
};

interface StatePanelProps {
  icon: ReactNode;
  title: string;
  action: { href: string; label: string };
  className?: string;
  children: ReactNode;
}

const StatePanel: FC<StatePanelProps> = ({ icon, title, action, className, children }) => (
  <section
    className={cn(
      "flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:p-5 [&>svg]:size-6 [&>svg]:shrink-0",
      className,
    )}
  >
    {icon}
    <div className="min-w-0 flex-1">
      <h2 className="font-bold text-foreground">{title}</h2>
      <p className="text-sm text-foreground/80">{children}</p>
    </div>
    <Button asChild variant="outline">
      <Link href={action.href}>{action.label}</Link>
    </Button>
  </section>
);
