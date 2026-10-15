"use server";

import { proofService } from "~/infra";
import { action } from "~/lib/action";
import { ownTaskSchema, proofSchema } from "./schema";

export const submitProofAction = action(
  proofSchema,
  async (user, proof) => {
    await proofService.submitProof(user, proof);
  },
  { revalidate: ["/tasks", "/proofs"] },
);

export const addOwnTaskAction = action(
  ownTaskSchema,
  async (user, ownTask) => {
    await proofService.addOwnTask(user, ownTask);
  },
  { revalidate: ["/proofs", "/admin/review"] },
);
