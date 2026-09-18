"use client";

import { type FC, useState } from "react";
import type { ProofStatus } from "~/domain/proof";
import type { PublicUserView } from "~/domain/user";
import { Notice } from "../ui/feedback";
import { ProofForm } from "./form";

interface Props {
  taskId: string;
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
      <Notice>
        Awaiting review. You will be notified either way; see My proofs for who is reviewing it.
      </Notice>
    );
  }
  if (status === "approved") {
    return <Notice>Completed — your points have been awarded.</Notice>;
  }
  if (unavailable) {
    return <Notice>{unavailable}</Notice>;
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
