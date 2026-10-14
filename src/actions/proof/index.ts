"use server";

import { proofService } from "~/infra";
import { action } from "~/lib/action";
import { proofSchema } from "./schema";

export const submitProofAction = action(
  proofSchema,
  async (user, proof) => {
    await proofService.submitProof(user, proof);
  },
  { revalidate: ["/tasks", "/proofs"] },
);
