import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createProofService } from "~/core/services/proof";
import { createPhotoService } from "~/core/services/photo";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import type { User } from "~/domain/user";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { connect, fakeNotificationPort, noAdmins, truncateAll } from "./helpers";
import { first } from "../support";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);

afterAll(async () => {
  await client.end();
});
beforeEach(async () => {
  await truncateAll(db);
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);

function storageWith(objects: Record<string, Uint8Array>) {
  const storage = createMemoryObjectStorage();
  for (const [key, bytes] of Object.entries(objects)) {
    storage.put(key, bytes, "image/jpeg");
  }

  return storage;
}

function jpegOfSize(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(JPEG);

  return bytes;
}

async function seed() {
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const alice = await users.upsertFromIdentity({
    ipaUniqueId: "ipa-alice",
    uid: "alice",
    displayName: "Alice",
    groups: ["members"],
  });
  const bob = await users.upsertFromIdentity({
    ipaUniqueId: "ipa-bob",
    uid: "bob",
    displayName: "Bob",
    groups: ["members"],
  });
  const boss = await users.upsertFromIdentity({
    ipaUniqueId: "ipa-boss",
    uid: "boss",
    displayName: "Boss",
    groups: ["team_juhatus"],
  });

  const photoTask = await tasks.create({
    title: "Sort the recycling",
    description: "",
    categoryId: category.id,
    points: 10,
    policy: "one_per_user",
    cooldownSeconds: null,
    photoRequired: true,
    photoInstructions: "Photo of the sorted bins",
  });
  const plainTask = await tasks.create({
    title: "Attend the meeting",
    description: "",
    categoryId: category.id,
    points: 5,
    policy: "one_per_user",
    cooldownSeconds: null,
    photoRequired: false,
    photoInstructions: null,
  });

  return {
    photoTask,
    plainTask,
    alice,
    bob,
    admin: boss,
  };
}

function services(storage: ReturnType<typeof createMemoryObjectStorage>) {
  const photos = createPhotoService({
    storage,
    proofs,
  });
  const proofService = createProofService({
    proofs,
    tasks,
    photos,
    notifications: fakeNotificationPort(),
    admins: noAdmins,
    clock: {
      now: () => new Date(),
    },
  });

  return {
    photos,
    proofService,
  };
}

describe("photos validation", () => {
  it("accepts a real JPEG and records the sniffed content type", async () => {
    const { photoTask, alice } = await seed();
    const key = `photos/${alice.id}/draft/photo.jpg`;
    const storage = storageWith({ [key]: JPEG });
    const { proofService } = services(storage);

    const proof = await proofService.submitProof(alice, {
      taskId: photoTask.id,
      objectKeys: [key],
    });

    const photoRow = first(await proofs.listPhotos(proof.id));
    expect(photoRow.contentType).toBe("image/jpeg");
  });

  it("rejects a disallowed format even when the upload submitted image/jpeg", async () => {
    const { photoTask, alice } = await seed();
    const key = `photos/${alice.id}/draft/sneaky.jpg`;

    const storage = storageWith({ [key]: GIF });
    const { proofService } = services(storage);

    await expect(
      proofService.submitProof(alice, {
        taskId: photoTask.id,
        objectKeys: [key],
      }),
    ).rejects.toThrow(/JPEG, PNG, and WebP/i);

    expect(storage.has(key)).toBe(false);
    expect(await proofs.listForUser(alice.id)).toEqual([]);
  });

  it("rejects an photo over the configured size limit", async () => {
    const { photoTask, alice } = await seed();
    const key = `photos/${alice.id}/draft/huge.jpg`;
    const storage = storageWith({ [key]: jpegOfSize(5 * 1024 * 1024 + 1) });
    const { proofService } = services(storage);

    await expect(
      proofService.submitProof(alice, {
        taskId: photoTask.id,
        objectKeys: [key],
      }),
    ).rejects.toThrow(/5 MB or smaller/i);
  });

  it("rejects an object key belonging to another user", async () => {
    const { photoTask, alice, bob } = await seed();
    const key = `photos/${bob.id}/draft/photo.jpg`;
    const storage = storageWith({ [key]: JPEG });
    const { proofService } = services(storage);

    await expect(
      proofService.submitProof(alice, {
        taskId: photoTask.id,
        objectKeys: [key],
      }),
    ).rejects.toThrow(/does not belong to you/i);
  });

  it("refuses an photo-required proof with no photos", async () => {
    const { photoTask, alice } = await seed();
    const { proofService } = services(storageWith({}));

    await expect(
      proofService.submitProof(alice, {
        taskId: photoTask.id,
        objectKeys: [],
      }),
    ).rejects.toThrow(/requires at least one photo/i);
  });

  it("refuses uploads on a task that does not require photos", async () => {
    const { plainTask, alice } = await seed();
    const key = `photos/${alice.id}/draft/photo.jpg`;
    const storage = storageWith({ [key]: JPEG });
    const { proofService } = services(storage);

    await expect(
      proofService.submitProof(alice, {
        taskId: plainTask.id,
        objectKeys: [key],
      }),
    ).rejects.toThrow(/does not accept photo uploads/i);
  });

  it("makes no object-storage calls at all for a task without photos", async () => {
    const { plainTask, alice } = await seed();
    const storage = storageWith({});
    const statSpy = vi.spyOn(storage, "stat");
    const presignSpy = vi.spyOn(storage, "presignUpload");
    const { proofService } = services(storage);

    await proofService.submitProof(alice, {
      taskId: plainTask.id,
      objectKeys: [],
    });

    expect(statSpy).not.toHaveBeenCalled();
    expect(presignSpy).not.toHaveBeenCalled();
  });
});

describe("photos access control", () => {
  function proofWithPhotos(alice: User) {
    const key = `photos/${alice.id}/draft/photo.jpg`;
    const storage = storageWith({ [key]: JPEG });
    const { proofService, photos } = services(storage);

    return {
      storage,
      photos,
      proofService,
      key,
    };
  }

  it("hides pending photos from visitors and other users, but not the owner or admins", async () => {
    const { photoTask, alice, bob, admin } = await seed();
    const { proofService, photos, key } = proofWithPhotos(alice);

    const proof = await proofService.submitProof(alice, {
      taskId: photoTask.id,
      objectKeys: [key],
    });
    const row = first(await proofs.listPhotos(proof.id));
    const target = {
      proofId: proof.id,
      photoId: row.id,
    };

    await expect(photos.openPhoto(null, target)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(photos.openPhoto(bob, target)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(photos.openPhoto(alice, target)).resolves.toBeDefined();
    await expect(photos.openPhoto(admin, target)).resolves.toBeDefined();
  });

  it("keeps rejected photos restricted to the owner and admins", async () => {
    const { photoTask, alice, bob, admin } = await seed();
    const { proofService, photos, key } = proofWithPhotos(alice);

    const proof = await proofService.submitProof(alice, {
      taskId: photoTask.id,
      objectKeys: [key],
    });
    await proofs.reject({
      proofId: proof.id,
      reviewerId: admin.id,
      reason: "Blurry",
      now: new Date(),
    });

    const row = first(await proofs.listPhotos(proof.id));
    const target = {
      proofId: proof.id,
      photoId: row.id,
    };

    await expect(photos.openPhoto(null, target)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(photos.openPhoto(bob, target)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(photos.openPhoto(alice, target)).resolves.toBeDefined();
    await expect(photos.openPhoto(admin, target)).resolves.toBeDefined();
  });

  it("makes approved photos public, including to unauthenticated visitors", async () => {
    const { photoTask, alice, bob, admin } = await seed();
    const { proofService, photos, key } = proofWithPhotos(alice);

    const proof = await proofService.submitProof(alice, {
      taskId: photoTask.id,
      objectKeys: [key],
    });
    const row = first(await proofs.listPhotos(proof.id));
    const target = {
      proofId: proof.id,
      photoId: row.id,
    };

    await expect(photos.openPhoto(null, target)).rejects.toMatchObject({ code: "FORBIDDEN" });

    await proofs.approve({
      proofId: proof.id,
      reviewerId: admin.id,
      now: new Date(),
    });

    await expect(photos.openPhoto(null, target)).resolves.toBeDefined();
    await expect(photos.openPhoto(bob, target)).resolves.toBeDefined();
  });

  it("refuses an photos id that belongs to a different proof", async () => {
    const { photoTask, plainTask, alice } = await seed();
    const { proofService, photos, key } = proofWithPhotos(alice);

    const proof = await proofService.submitProof(alice, {
      taskId: photoTask.id,
      objectKeys: [key],
    });
    const other = await proofService.submitProof(alice, {
      taskId: plainTask.id,
      objectKeys: [],
    });
    const row = first(await proofs.listPhotos(proof.id));

    await expect(
      photos.openPhoto(alice, {
        proofId: other.id,
        photoId: row.id,
      }),
    ).rejects.toThrow(/not part of this proof/i);
  });

  it("refuses to issue an upload URL to an unauthenticated user", async () => {
    const { photos } = services(storageWith({}));
    await expect(
      photos.createPhotoUpload(null, {
        proofRef: "x",
        contentType: "image/jpeg",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("refuses to issue an upload URL for a disallowed content type", async () => {
    const { alice } = await seed();
    const { photos } = services(storageWith({}));
    await expect(
      photos.createPhotoUpload(alice, {
        proofRef: "x",
        contentType: "image/gif",
      }),
    ).rejects.toThrow(/JPEG, PNG, and WebP/i);
  });
});
