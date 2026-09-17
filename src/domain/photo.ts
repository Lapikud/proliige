import { isAllowedContentType, photoLimits, type AllowedContentType } from "~/config/photo";

export function sniffPhotoContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export type PhotoValidationFailure =
  | {
      kind: "unsupported_type";
      detected: string | null;
    }
  | {
      kind: "too_large";
      sizeBytes: number;
      maxBytes: number;
    }
  | { kind: "empty" };

export type PhotoValidationResult =
  | {
      ok: true;
      contentType: AllowedContentType;
    }
  | {
      ok: false;
      failure: PhotoValidationFailure;
    };

export function validatePhotoBytes(
  leadingBytes: Uint8Array,
  sizeBytes: number,
): PhotoValidationResult {
  if (sizeBytes <= 0) {
    return {
      ok: false,
      failure: { kind: "empty" },
    };
  }
  if (sizeBytes > photoLimits.maxFileSizeBytes) {
    return {
      ok: false,
      failure: {
        kind: "too_large",
        sizeBytes,
        maxBytes: photoLimits.maxFileSizeBytes,
      },
    };
  }
  const detected = sniffPhotoContentType(leadingBytes);
  if (detected === null || !isAllowedContentType(detected)) {
    return {
      ok: false,
      failure: {
        kind: "unsupported_type",
        detected,
      },
    };
  }

  return {
    ok: true,
    contentType: detected,
  };
}

export function describePhotoFailure(failure: PhotoValidationFailure): string {
  switch (failure.kind) {
    case "empty":
      return "The uploaded file is empty.";
    case "too_large":
      return `Photos must be ${Math.floor(failure.maxBytes / (1024 * 1024))} MB or smaller.`;
    case "unsupported_type":
      return "Only JPEG, PNG, and WebP photos are accepted.";
  }
}

export function buildPhotoObjectKey(userId: string, proofRef: string, extension: string): string {
  const random = crypto.randomUUID();

  return `photos/${userId}/${proofRef}/${random}.${extension}`;
}

export function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function objectKeyBelongsToUser(objectKey: string, userId: string): boolean {
  return objectKey.startsWith(`photos/${userId}/`);
}
