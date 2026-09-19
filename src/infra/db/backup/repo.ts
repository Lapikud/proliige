import { asc, eq, isNull } from "drizzle-orm";
import type { PhotoBackupLog } from "~/core/ports/backup";
import type { Database } from "../client";
import { proofPhotos } from "../proof/model";
import { photoBackups } from "./model";

export function createPhotoBackupLog(db: Database): PhotoBackupLog {
  const record = async (objectKey: string, at: Date, missing: boolean) => {
    await db
      .insert(photoBackups)
      .values({
        objectKey,
        backedUpAt: at,
        missing,
      })
      .onConflictDoNothing();
  };

  return {
    async photosToBackUp(limit) {
      const rows = await db
        .select({ objectKey: proofPhotos.objectKey })
        .from(proofPhotos)
        .leftJoin(photoBackups, eq(photoBackups.objectKey, proofPhotos.objectKey))
        .where(isNull(photoBackups.objectKey))
        .orderBy(asc(proofPhotos.uploadedAt))
        .limit(limit);

      return rows.map((row) => row.objectKey);
    },
    recordBackedUp: (objectKey, at) => record(objectKey, at, false),
    recordMissing: (objectKey, at) => record(objectKey, at, true),
  };
}
