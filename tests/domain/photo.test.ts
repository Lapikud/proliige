import { describe, expect, it } from "vitest";
import { photoLimits } from "~/config/photo";
import {
  buildPhotoObjectKey,
  extensionForContentType,
  objectKeyBelongsToUser,
  sniffPhotoContentType,
  validatePhotoBytes,
} from "~/domain/photo";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);
const svg = new Uint8Array([...Buffer.from('<svg xmlns="http://www')]);

describe("sniffPhotoContentType", () => {
  it("identifies JPEG", () => {
    expect(sniffPhotoContentType(jpeg)).toBe("image/jpeg");
  });
  it("identifies PNG", () => {
    expect(sniffPhotoContentType(png)).toBe("image/png");
  });
  it("identifies WebP", () => {
    expect(sniffPhotoContentType(webp)).toBe("image/webp");
  });

  it("rejects a GIF, which is not an allowed type", () => {
    expect(sniffPhotoContentType(gif)).toBeNull();
  });

  it("rejects SVG, which can carry script", () => {
    expect(sniffPhotoContentType(svg)).toBeNull();
  });

  it("rejects a truncated header", () => {
    expect(sniffPhotoContentType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });

  it("rejects RIFF that is not WEBP", () => {
    const wav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    expect(sniffPhotoContentType(wav)).toBeNull();
  });
});

describe("validatePhotoBytes", () => {
  it("accepts an allowed photo within the size limit and reports the detected type", () => {
    const result = validatePhotoBytes(png, 1024);
    expect(result).toEqual({
      ok: true,
      contentType: "image/png",
    });
  });

  it("rejects an empty object", () => {
    const result = validatePhotoBytes(png, 0);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.failure.kind).toBe("empty");
  });

  it("rejects an object over the configured size limit", () => {
    const result = validatePhotoBytes(png, photoLimits.maxFileSizeBytes + 1);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.failure.kind).toBe("too_large");
  });

  it("rejects a disallowed format regardless of size", () => {
    const result = validatePhotoBytes(gif, 1024);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.failure.kind).toBe("unsupported_type");
  });

  it("ignores a client-declared type and trusts the bytes", () => {
    const result = validatePhotoBytes(png, 2048);
    expect(result.ok && result.contentType).toBe("image/png");
  });
});

describe("object keys", () => {
  it("scopes a key to the uploading user", () => {
    const key = buildPhotoObjectKey("owner", "draft-1", "png");
    expect(key.startsWith("photos/owner/draft-1/")).toBe(true);
    expect(objectKeyBelongsToUser(key, "owner")).toBe(true);
  });

  it("refuses a key belonging to another user", () => {
    const key = buildPhotoObjectKey("other", "draft-1", "png");
    expect(objectKeyBelongsToUser(key, "owner")).toBe(false);
  });

  it("is not fooled by a user id that is a prefix of another", () => {
    expect(objectKeyBelongsToUser("photos/owner2/d/x.png", "owner")).toBe(false);
  });

  it("maps content types to extensions", () => {
    expect(extensionForContentType("image/jpeg")).toBe("jpg");
    expect(extensionForContentType("image/png")).toBe("png");
    expect(extensionForContentType("image/webp")).toBe("webp");
  });
});
