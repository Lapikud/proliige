import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createBackupService } from "~/core/services/backup";
import { createPhotoBackupLog } from "~/infra/db/backup/repo";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import { connect, fixedClock, seedUsers, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);
const log = createPhotoBackupLog(db);

afterAll(async () => {
  await client.end();
});
beforeEach(async () => {
  await truncateAll(db);
});

function setup() {
  const storage = createMemoryObjectStorage();
  const uploaded = new Map<string, Uint8Array>();
  const backups = createBackupService({
    log,
    storage,
    destination: {
      upload: (path, contents) => {
        uploaded.set(path, contents);

        return Promise.resolve();
      },
    },
    clock: fixedClock(new Date("2026-09-20T01:00:00Z")),
  });

  return {
    storage,
    uploaded,
    backups,
  };
}

async function proofWithPhotos(objectKeys: ReadonlyArray<string>) {
  const { alice } = await seedUsers(users);
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const task = await tasks.create({
    title: "Restock the fridge",
    description: "",
    categoryId: category.id,
    points: 10,
    policy: "repeatable",
    cooldownSeconds: 0,
    photoRequired: true,
    photoInstructions: null,
  });
  await proofs.createPendingProof({
    taskId: task.id,
    userId: alice.id,
    photos: objectKeys.map((objectKey) => ({
      objectKey,
      contentType: "image/jpeg",
      sizeBytes: 4,
    })),
    now: new Date("2026-09-19T12:00:00Z"),
  });
}

describe("weekly photo backup", () => {
  it("copies every proof photo to the backup destination", async () => {
    const { storage, uploaded, backups } = setup();
    storage.put("proofs/a.jpg", new Uint8Array([1, 2, 3, 4]), "image/jpeg");
    storage.put("proofs/b.jpg", new Uint8Array([5, 6, 7, 8]), "image/jpeg");
    await proofWithPhotos(["proofs/a.jpg", "proofs/b.jpg"]);

    expect(await backups.backUpPhotos()).toEqual({
      copied: 2,
      missing: 0,
    });
    expect([...uploaded.keys()].sort()).toEqual(["proofs/a.jpg", "proofs/b.jpg"]);
    expect(uploaded.get("proofs/a.jpg")).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("copies nothing the second week when nothing new was uploaded", async () => {
    const { storage, uploaded, backups } = setup();
    storage.put("proofs/a.jpg", new Uint8Array([1, 2, 3, 4]), "image/jpeg");
    await proofWithPhotos(["proofs/a.jpg"]);

    await backups.backUpPhotos();
    uploaded.clear();

    expect(await backups.backUpPhotos()).toEqual({
      copied: 0,
      missing: 0,
    });
    expect(uploaded.size).toBe(0);
  });

  it("skips a photo missing from storage instead of failing every week", async () => {
    const { uploaded, backups } = setup();
    await proofWithPhotos(["proofs/gone.jpg"]);

    expect(await backups.backUpPhotos()).toEqual({
      copied: 0,
      missing: 1,
    });
    expect(await backups.backUpPhotos()).toEqual({
      copied: 0,
      missing: 0,
    });
    expect(uploaded.size).toBe(0);
  });
});
