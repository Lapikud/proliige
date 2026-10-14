export interface StoredObjectInfo {
  readonly objectKey: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface ObjectStoragePort {
  put(objectKey: string, bytes: Uint8Array, contentType: string): Promise<void>;

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
