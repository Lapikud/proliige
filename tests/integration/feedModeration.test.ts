import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createCommentService } from "~/core/services/comment";
import { createFeedService } from "~/core/services/feed";
import { createLikeService } from "~/core/services/like";
import { createPhotoService } from "~/core/services/photo";
import { createProofService } from "~/core/services/proof";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createCommentRepository } from "~/infra/db/feed/comment";
import { createLikeRepository } from "~/infra/db/feed/like";
import { createFeedRepository } from "~/infra/db/feed/repo";
import { createLeaderboardRepository } from "~/infra/db/points/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createRecognitionRepository } from "~/infra/db/recognition/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import { connect, fakeNotificationPort, seedUsers, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);
const leaderboard = createLeaderboardRepository(db);
const feed = createFeedService({ feed: createFeedRepository(db) });
const notifications = fakeNotificationPort();
const recognitions = createRecognitionRepository(db, ["members", "pixels"]);
const clock = { now: () => new Date() };
const likes = createLikeService({
  likes: createLikeRepository(db),
  proofs,
  recognitions,
  clock,
});
const comments = createCommentService({
  comments: createCommentRepository(db),
  proofs,
  recognitions,
  notifications,
  clock,
});
let people: Awaited<ReturnType<typeof seedUsers>>;
const proofService = createProofService({
  proofs,
  tasks,
  photos: createPhotoService({
    storage: createMemoryObjectStorage(),
    proofs,
  }),
  notifications,
  admins: { listAdmins: () => Promise.resolve([people.admin]) },
  clock: { now: () => new Date() },
});

afterAll(async () => {
  await client.end();
});
beforeEach(async () => {
  await truncateAll(db);
});

async function seed({
  policy = "one_per_user",
  showOnFeed = true,
}: {
  policy?: "one_per_user" | "single_winner";
  showOnFeed?: boolean;
} = {}) {
  people = await seedUsers(users);
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const task = await tasks.create({
    title: "Sort the recycling",
    description: "",
    categoryId: category.id,
    points: 10,
    policy,
    cooldownSeconds: null,
    photoRequired: false,
    photoInstructions: null,
    textRequired: false,
    showOnFeed,
  });
  const proof = await proofService.submitProof(people.alice, {
    taskId: task.id,
    objectKeys: [],
  });
  await proofService.approveProof(people.admin, proof.id);

  return {
    ...people,
    task,
    proof,
  };
}

const feedIds = async (viewer: Parameters<typeof feed.listFeed>[0]) =>
  (await feed.listFeed(viewer, { cursor: null })).entries.map(({ proofId }) => proofId);
const points = async () => (await leaderboard.leaderboard())[0]?.totalPoints ?? 0;

describe("removing a post from the feed", () => {
  it("hides it from everyone but admins, keeps the points, and can be undone", async () => {
    const { proof, admin, bob } = await seed();

    await proofService.setProofHidden(admin, proof.id, true);
    expect(await feedIds(bob)).toEqual([]);
    expect(await feedIds(null)).toEqual([]);
    const [shownToAdmin] = (await feed.listFeed(admin, { cursor: null })).entries;
    expect(shownToAdmin).toMatchObject({
      proofId: proof.id,
      offFeed: "removed",
    });
    expect(await points()).toBe(10);

    await proofService.setProofHidden(admin, proof.id, false);
    expect(await feedIds(bob)).toEqual([proof.id]);
  });

  it("is for admins only", async () => {
    const { proof, alice } = await seed();

    await expect(proofService.setProofHidden(alice, proof.id, true)).rejects.toThrow();
  });

  it("stops likes and comments except from admins", async () => {
    const { proof, admin, bob } = await seed();
    await proofService.setProofHidden(admin, proof.id, true);

    await expect(likes.toggleLike(bob, proof.id)).rejects.toThrow(/not on the feed/);
    await expect(
      comments.addComment(bob, {
        proofId: proof.id,
        body: "Nice",
      }),
    ).rejects.toThrow(/not on the feed/);
    await expect(likes.toggleLike(admin, proof.id)).resolves.toBeDefined();
  });
});

describe("tasks kept off the feed", () => {
  it("never show their proofs, while the points still count", async () => {
    const { proof, admin, bob } = await seed({ showOnFeed: false });

    expect(await feedIds(bob)).toEqual([]);
    const [shownToAdmin] = (await feed.listFeed(admin, { cursor: null })).entries;
    expect(shownToAdmin).toMatchObject({
      proofId: proof.id,
      offFeed: "task",
    });
    expect(await points()).toBe(10);
  });
});

describe("unapproving a post", () => {
  it("takes it off the feed, rejects the proof and takes the points back once", async () => {
    const { proof, admin, bob } = await seed();

    await proofService.unapproveProof(admin, {
      proofId: proof.id,
      reason: "Wrong task",
    });
    await proofService.unapproveProof(admin, {
      proofId: proof.id,
      reason: null,
    });

    expect(await feedIds(bob)).toEqual([]);
    const context = await proofs.findWithContext(proof.id);
    expect(context?.proof.status).toBe("rejected");
    expect(context?.proof.rejectionReason).toBe("Unapproved: Wrong task");
    expect(context?.pointsReversed).toBe(true);
    expect(await points()).toBe(0);
    expect((await leaderboard.leaderboard())[0]?.approvedProofs).toBe(0);
  });

  it("does not take the points back twice after the task was removed", async () => {
    const { proof, task, admin } = await seed();
    await tasks.removeWithHistory({
      taskId: task.id,
      removedBy: admin.id,
      now: new Date(),
    });

    await proofService.unapproveProof(admin, {
      proofId: proof.id,
      reason: null,
    });

    expect(await points()).toBe(0);
  });

  it("frees a first-to-complete task for the next pixel", async () => {
    const { task, proof, admin, bob } = await seed({ policy: "single_winner" });

    await proofService.unapproveProof(admin, {
      proofId: proof.id,
      reason: null,
    });

    await expect(
      proofService.submitProof(bob, {
        taskId: task.id,
        objectKeys: [],
      }),
    ).resolves.toMatchObject({ status: "pending" });
  });

  it("is for admins only", async () => {
    const { proof, alice } = await seed();

    await expect(
      proofService.unapproveProof(alice, {
        proofId: proof.id,
        reason: null,
      }),
    ).rejects.toThrow();
  });
});

describe("reporting a post", () => {
  it("tells the admins once per reporter and lists it until resolved", async () => {
    const { proof, admin, bob } = await seed();
    notifications.publishMany.mockClear();

    await proofService.reportProof(bob, {
      proofId: proof.id,
      reason: "Not real",
    });
    await proofService.reportProof(bob, {
      proofId: proof.id,
      reason: "Not real",
    });

    expect(notifications.publishMany).toHaveBeenCalledTimes(1);
    const [seenByBob] = (await feed.listFeed(bob, { cursor: null })).entries;
    expect(seenByBob?.reportedByUser).toBe(true);
    const [reported] = await proofService.listReportedProofs(admin);
    expect(reported?.openReports).toMatchObject([
      {
        reporter: { id: bob.id },
        reason: "Not real",
      },
    ]);

    await proofService.dismissReports(admin, proof.id);
    expect(await proofService.listReportedProofs(admin)).toEqual([]);
  });

  it("resolves the reports when the post is removed", async () => {
    const { proof, admin, bob } = await seed();
    await proofService.reportProof(bob, {
      proofId: proof.id,
      reason: "Not real",
    });

    await proofService.setProofHidden(admin, proof.id, true);

    expect(await proofService.listReportedProofs(admin)).toEqual([]);
  });

  it("refuses posts that are not on the feed", async () => {
    const { proof, admin, bob } = await seed();
    await proofService.setProofHidden(admin, proof.id, true);

    await expect(
      proofService.reportProof(bob, {
        proofId: proof.id,
        reason: "Not real",
      }),
    ).rejects.toThrow(/not on the feed/);
  });

  it("needs a signed-in user", async () => {
    const { proof } = await seed();

    await expect(
      proofService.reportProof(null, {
        proofId: proof.id,
        reason: "Not real",
      }),
    ).rejects.toThrow();
  });
});
