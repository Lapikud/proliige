import type { BackupDestination, PhotoBackupLog } from "../ports/backup";
import type { ClockPort } from "../ports/clock";
import type { ObjectStoragePort } from "../ports/objectStorage";

const BATCH_SIZE = 50;

interface Deps {
  readonly log: PhotoBackupLog;
  readonly storage: ObjectStoragePort;
  readonly destination: BackupDestination;
  readonly clock: ClockPort;
}

export interface BackupOutcome {
  readonly copied: number;
  readonly missing: number;
}

export function createBackupService({ log, storage, destination, clock }: Deps) {
  return {
    async backUpPhotos(): Promise<BackupOutcome> {
      let copied = 0;
      let missing = 0;

      let batch = await log.photosToBackUp(BATCH_SIZE);
      while (batch.length > 0) {
        for (const objectKey of batch) {
          if ((await storage.stat(objectKey)) === null) {
            await log.recordMissing(objectKey, clock.now());
            missing += 1;
            continue;
          }
          const { stream } = await storage.getStream(objectKey);
          await destination.upload(
            objectKey,
            new Uint8Array(await new Response(stream).arrayBuffer()),
          );
          await log.recordBackedUp(objectKey, clock.now());
          copied += 1;
        }
        batch = await log.photosToBackUp(BATCH_SIZE);
      }

      return {
        copied,
        missing,
      };
    },
  };
}

export type BackupService = ReturnType<typeof createBackupService>;
