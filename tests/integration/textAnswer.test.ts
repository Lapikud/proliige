import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createFeedService } from "~/core/services/feed";
import { createProofService } from "~/core/services/proof";
import { createPhotoService } from "~/core/services/photo";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createFeedRepository } from "~/infra/db/feed/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { connect, fakeNotificationPort, noAdmins, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);
const feed = createFeedService({ feed: createFeedRepository(db) });
const proofService = createProofService({
  proofs,
  tasks,
  photos: createPhotoService({
    storage: createMemoryObjectStorage(),
    proofs,
  }),
  notifications: fakeNotificationPort(),
  admins: noAdmins,
  clock: { now: () => new Date() },
});

afterAll(async () => {
  await client.end();
});
beforeEach(async () => {
  await truncateAll(db);
});

async function seed(textRequired: boolean) {
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
  const task = await tasks.create({
    title: "Write a blog post",
    description: "Paste the link to your post.",
    categoryId: category.id,
    points: 10,
    policy: "one_per_user",
    cooldownSeconds: null,
    photoRequired: false,
    photoInstructions: null,
    textRequired,
  });

  return {
    task,
    alice,
  };
}

describe("text answers", () => {
  it("rejects a blank answer when the task requires one", async () => {
    const { task, alice } = await seed(true);

    await expect(
      proofService.submitProof(alice, {
        taskId: task.id,
        textAnswer: "   ",
        objectKeys: [],
      }),
    ).rejects.toThrow(/written answer/i);
    expect(await proofs.listForUser(alice.id)).toEqual([]);
  });

  it("stores the trimmed answer", async () => {
    const { task, alice } = await seed(true);

    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      textAnswer: "  https://example.com/post  ",
      objectKeys: [],
    });

    expect((await proofs.findById(proof.id))?.textAnswer).toBe("https://example.com/post");
  });

  it("drops an answer sent to a task that does not ask for one", async () => {
    const { task, alice } = await seed(false);

    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      textAnswer: "unexpected",
      objectKeys: [],
    });

    expect((await proofs.findById(proof.id))?.textAnswer).toBeNull();
  });

  it("shows the answer on the feed once approved", async () => {
    const { task, alice } = await seed(true);
    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      textAnswer: "https://example.com/post",
      objectKeys: [],
    });
    await proofs.approve({
      proofId: proof.id,
      reviewerId: alice.id,
      now: new Date(),
    });

    const [entry] = (await feed.listFeed(null, { cursor: null })).entries;
    expect(entry?.textAnswer).toBe("https://example.com/post");
  });
});
