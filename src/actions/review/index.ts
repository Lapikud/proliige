"use server";

import { proofService } from "~/infra";
import { action } from "~/lib/action";
import {
  approveSchema,
  dismissReportsSchema,
  rejectSchema,
  setProofHiddenSchema,
  unapproveSchema,
} from "./schema";

const revalidate = ["/", "/admin/review", "/proofs", "/tasks"];

export const approveProofAction = action(
  approveSchema,
  async (user, { proofId, points }) => {
    await proofService.approveProof(user, proofId, points);
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

const moderated = [...revalidate, "/api/feed", "/api/leaderboard"];

export const setProofHiddenAction = action(
  setProofHiddenSchema,
  async (user, { proofId, hidden }) => {
    await proofService.setProofHidden(user, proofId, hidden);
  },
  { revalidate: moderated },
);

export const unapproveProofAction = action(
  unapproveSchema,
  async (user, { proofId, reason }) => {
    await proofService.unapproveProof(user, {
      proofId,
      reason: reason || null,
    });
  },
  { revalidate: moderated },
);

export const dismissReportsAction = action(
  dismissReportsSchema,
  async (user, { proofId }) => {
    await proofService.dismissReports(user, proofId);
  },
  { revalidate: ["/admin/review"] },
);
