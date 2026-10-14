import { z } from "zod";
import { photoLimits } from "~/config/photo";

export const proofSchema = z.object({
  taskId: z.string().min(1),
  objectKeys: z.array(z.string().min(1)).max(photoLimits.maxPhotosPerProof),
  reviewerIds: z.array(z.uuid()).max(10),
});

export type ProofValues = z.infer<typeof proofSchema>;
