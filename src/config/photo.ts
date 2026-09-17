import { env } from "~/env.config";

export const allowedContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedContentType = (typeof allowedContentTypes)[number];

export function isAllowedContentType(value: string): value is AllowedContentType {
  return (allowedContentTypes as ReadonlyArray<string>).includes(value);
}

export const photoLimits = {
  maxFileSizeBytes: env.NEXT_PUBLIC_PHOTO_MAX_FILE_SIZE_BYTES,
  maxPhotosPerProof: env.NEXT_PUBLIC_PHOTO_MAX_PER_PROOF,
};
