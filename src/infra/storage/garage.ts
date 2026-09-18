import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { GarageEnv } from "~/env.config";
import type { ObjectStoragePort } from "~/core/ports/objectStorage";

export function createGarageObjectStorage(settings: GarageEnv): ObjectStoragePort {
  const client = new S3Client({
    endpoint: settings.GARAGE_ENDPOINT,
    region: settings.GARAGE_REGION,
    forcePathStyle: true,
    // Otherwise the SDK signs an empty-body checksum into upload URLs and Garage rejects every photo.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: settings.GARAGE_ACCESS_KEY,
      secretAccessKey: settings.GARAGE_SECRET_KEY,
    },
  });
  const bucket = settings.GARAGE_PHOTO_BUCKET;
  const object = (objectKey: string) => ({
    Bucket: bucket,
    Key: objectKey,
  });

  return {
    async ensureBucket() {
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch (error) {
        if (isNotFound(error)) {
          throw new Error(
            `The Garage bucket "${bucket}" does not exist; create it before starting the app.`,
            {
              cause: error,
            },
          );
        }
        throw error;
      }
    },

    async presignUpload({ objectKey, expiresInSeconds }) {
      const uploadUrl = await getSignedUrl(client, new PutObjectCommand(object(objectKey)), {
        expiresIn: expiresInSeconds,
      });

      return {
        objectKey,
        uploadUrl: forBrowser(uploadUrl, settings.GARAGE_PUBLIC_ENDPOINT),
        expiresInSeconds,
      };
    },

    async stat(objectKey) {
      try {
        const info = await client.send(new HeadObjectCommand(object(objectKey)));

        return {
          objectKey,
          contentType: info.ContentType ?? "application/octet-stream",
          sizeBytes: info.ContentLength ?? 0,
        };
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }
        throw error;
      }
    },

    async readLeadingBytes(objectKey, length) {
      const response = await client.send(
        new GetObjectCommand({
          ...object(objectKey),
          Range: `bytes=0-${length - 1}`,
        }),
      );
      if (!response.Body) {
        throw new Error(`Garage returned no body for ${objectKey}.`);
      }
      const bytes = await response.Body.transformToByteArray();

      return bytes.subarray(0, length);
    },

    async getStream(objectKey) {
      const [info, response] = await Promise.all([
        client.send(new HeadObjectCommand(object(objectKey))),
        client.send(new GetObjectCommand(object(objectKey))),
      ]);
      if (!response.Body) {
        throw new Error(`Garage returned no body for ${objectKey}.`);
      }

      return {
        stream: response.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        contentType: info.ContentType ?? "application/octet-stream",
        sizeBytes: info.ContentLength ?? 0,
      };
    },

    async remove(objectKey) {
      await client.send(new DeleteObjectCommand(object(objectKey)));
    },
  };
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  return ["NotFound", "NoSuchKey", "NoSuchBucket"].includes(String(error.name));
}

function forBrowser(url: string, publicEndpoint: string | undefined): string {
  if (publicEndpoint === undefined) {
    return url;
  }
  const parsed = new URL(url);
  const target = new URL(publicEndpoint);
  parsed.protocol = target.protocol;
  parsed.host = target.host;

  return parsed.toString();
}
