"use server";

import { proofService } from "~/infra";
import { action } from "~/lib/action";
import { approveSchema, rejectSchema } from "./schema";

const revalidate = ["/", "/admin/review", "/proofs", "/tasks"];

export const approveProofAction = action(
  approveSchema,
  async (user, { proofId }) => {
    await proofService.approveProof(user, proofId);
  },
  { revalidate },
);

export const rejectProofAction = action(
  rejectSchema,
  async (user, { proofId, reason }) => {
    await proofService.rejectProof(user, {
      proofId,
      reason: reason || null,
    });
  },
  { revalidate },
);
