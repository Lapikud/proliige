export interface BackupDestination {
  upload(path: string, contents: Uint8Array): Promise<void>;
}

export interface PhotoBackupLog {
  photosToBackUp(limit: number): Promise<Array<string>>;
  recordBackedUp(objectKey: string, at: Date): Promise<void>;
  recordMissing(objectKey: string, at: Date): Promise<void>;
}
