import { z } from "zod";
import { photoLimits } from "~/config/photo";

export const proofSchema = z.object({
  taskId: z.string().min(1),
  objectKeys: z.array(z.string().min(1)).max(photoLimits.maxPhotosPerProof),
  reviewerIds: z.array(z.uuid()).max(10),
});

export const photoUploadSchema = z.object({
  proofRef: z.string().min(1),
  contentType: z.string().min(1),
});

export type ProofValues = z.infer<typeof proofSchema>;
