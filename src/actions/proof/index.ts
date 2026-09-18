"use server";

import { proofService, photoService } from "~/infra";
import { action } from "~/lib/action";
import { proofSchema, photoUploadSchema } from "./schema";

export const createPhotoUploadAction = action(photoUploadSchema, async (user, upload) => {
  const { objectKey, uploadUrl } = await photoService.createPhotoUpload(user, upload);

  return {
    objectKey,
    uploadUrl,
  };
});

export const submitProofAction = action(
  proofSchema,
  async (user, proof) => {
    await proofService.submitProof(user, proof);
  },
  { revalidate: ["/tasks", "/proofs"] },
);
