import { isOnFeed, type PhotoRef } from "~/domain/proof";
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
    uploadPhoto: guard(
      userCanSubmitProof,
      async (
        user,
        input: {
          proofRef: string;
          bytes: Uint8Array;
        },
      ) => {
        const result = validatePhotoBytes(
          input.bytes.subarray(0, SNIFF_LENGTH),
          input.bytes.length,
        );
        if (!result.ok) {
          throw validation(describePhotoFailure(result.failure));
        }
        const objectKey = buildPhotoObjectKey(
          user.id,
          input.proofRef,
          extensionForContentType(result.contentType),
        );
        await deps.storage.put(objectKey, input.bytes, result.contentType);

        return { objectKey };
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
        const context = await deps.proofs.findWithContext(input.proofId);
        if (context === null) {
          throw notFound("That proof does not exist.");
        }

        const match = context.photos.find((e) => e.id === input.photoId);
        if (match === undefined) {
          throw notFound("That photo is not part of this proof.");
        }

        const onFeed = isOnFeed(context.proof, { showOnFeed: context.taskShowOnFeed });
        if (
          !userCanViewPhoto(user, {
            userId: context.proof.userId,
            onFeed,
          })
        ) {
          throw forbidden("You are not allowed to view this photo.");
        }

        return deps.storage.getStream(match.objectKey);
      },
    ),
  };
}

export type PhotoService = ReturnType<typeof createPhotoService>;
