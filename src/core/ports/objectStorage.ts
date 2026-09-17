export interface StoredObjectInfo {
  readonly objectKey: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface PresignedUpload {
  readonly objectKey: string;
  readonly uploadUrl: string;
  readonly expiresInSeconds: number;
}

export interface ObjectStoragePort {
  presignUpload(input: {
    objectKey: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<PresignedUpload>;

  stat(objectKey: string): Promise<StoredObjectInfo | null>;

  readLeadingBytes(objectKey: string, length: number): Promise<Uint8Array>;

  getStream(objectKey: string): Promise<{
    stream: ReadableStream<Uint8Array>;
    contentType: string;
    sizeBytes: number;
  }>;

  remove(objectKey: string): Promise<void>;

  ensureBucket(): Promise<void>;
}
