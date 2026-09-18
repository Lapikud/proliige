import type { ObjectStoragePort } from "~/core/ports/objectStorage";

interface StoredObject {
  bytes: Uint8Array;
  contentType: string;
}

export function createMemoryObjectStorage() {
  const objects = new Map<string, StoredObject>();

  const find = (objectKey: string) => {
    const object = objects.get(objectKey);
    if (!object) {
      throw new Error(`No object stored at ${objectKey}.`);
    }

    return object;
  };

  const storage: ObjectStoragePort & {
    put(objectKey: string, bytes: Uint8Array, contentType: string): void;
    has(objectKey: string): boolean;
  } = {
    put: (objectKey, bytes, contentType) =>
      void objects.set(objectKey, {
        bytes,
        contentType,
      }),
    has: (objectKey) => objects.has(objectKey),

    ensureBucket: () => Promise.resolve(),

    presignUpload: ({ objectKey, expiresInSeconds }) =>
      Promise.resolve({
        objectKey,
        uploadUrl: `memory://${objectKey}`,
        expiresInSeconds,
      }),

    stat: (objectKey) => {
      const object = objects.get(objectKey);

      return Promise.resolve(
        object
          ? {
              objectKey,
              contentType: object.contentType,
              sizeBytes: object.bytes.length,
            }
          : null,
      );
    },

    readLeadingBytes: (objectKey, length) =>
      Promise.resolve(find(objectKey).bytes.subarray(0, length)),

    getStream: (objectKey) => {
      const { bytes, contentType } = find(objectKey);

      return Promise.resolve({
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        contentType,
        sizeBytes: bytes.length,
      });
    },

    remove: (objectKey) => {
      objects.delete(objectKey);

      return Promise.resolve();
    },
  };

  return storage;
}
