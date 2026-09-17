import { isAllowedContentType } from "~/config/photo";
import { env } from "~/env.config";
import type { PhotoRef } from "~/domain/proof";
import { forbidden, notFound, validation } from "~/domain/errors";
import {
  buildPhotoObjectKey,
  describePhotoFailure,
  extensionForContentType,
  validatePhotoBytes,
} from "~/domain/photo";
import { userCanSubmitProof, userCanViewFeed, userCanViewPhoto } from "~/domain/rules";
import type { ProofRepository } from "../ports/proof";
import type { ObjectStoragePort } from "../ports/objectStorage";
import { guard } from "../guard";

export interface PhotoServiceDeps {
  readonly storage: ObjectStoragePort;
  readonly proofs: ProofRepository;
}

const SNIFF_LENGTH = 16;

export function createPhotoService(deps: PhotoServiceDeps) {
  return {
    createPhotoUpload: guard(
      userCanSubmitProof,
      async (
        user,
        input: {
          proofRef: string;
          contentType: string;
        },
      ) => {
        if (!isAllowedContentType(input.contentType)) {
          throw validation("Only JPEG, PNG, and WebP photos are accepted.");
        }
        const objectKey = buildPhotoObjectKey(
          user.id,
          input.proofRef,
          extensionForContentType(input.contentType),
        );

        return deps.storage.presignUpload({
          objectKey,
          contentType: input.contentType,
          expiresInSeconds: env.PHOTO_UPLOAD_URL_TTL_SECONDS,
        });
      },
    ),

    async verifyPhotos(objectKeys: ReadonlyArray<string>): Promise<Array<PhotoRef>> {
      const refs: Array<PhotoRef> = [];
      for (const objectKey of objectKeys) {
        const info = await deps.storage.stat(objectKey);
        if (info === null) {
          throw validation("An uploaded photo could not be found. Try again.");
        }
        const leading = await deps.storage.readLeadingBytes(objectKey, SNIFF_LENGTH);
        const result = validatePhotoBytes(leading, info.sizeBytes);
        if (!result.ok) {
          await deps.storage.remove(objectKey).catch(() => undefined);
          throw validation(describePhotoFailure(result.failure));
        }
        refs.push({
          objectKey,

          contentType: result.contentType,
          sizeBytes: info.sizeBytes,
        });
      }

      return refs;
    },

    openPhoto: guard(
      userCanViewFeed,
      async (
        user,
        input: {
          proofId: string;
          photoId: string;
        },
      ) => {
        const proof = await deps.proofs.findById(input.proofId);
        if (proof === null) {
          throw notFound("That proof does not exist.");
        }

        const photos = await deps.proofs.listPhotos(proof.id);
        const match = photos.find((e) => e.id === input.photoId);
        if (match === undefined) {
          throw notFound("That photo is not part of this proof.");
        }

        if (!userCanViewPhoto(user, proof)) {
          throw forbidden("You are not allowed to view this photo.");
        }

        return deps.storage.getStream(match.objectKey);
      },
    ),
  };
}

export type PhotoService = ReturnType<typeof createPhotoService>;
