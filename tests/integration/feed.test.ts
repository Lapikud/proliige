import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { feedConfig } from "~/config/feed";
import { createFeedService } from "~/core/services/feed";
import { createCommentService } from "~/core/services/comment";
import { createLikeService } from "~/core/services/like";
import { createUserService } from "~/core/services/user";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createFeedRepository } from "~/infra/db/feed/repo";
import { createCommentRepository } from "~/infra/db/feed/comment";
import { createLikeRepository } from "~/infra/db/feed/like";
import { createUserRepository } from "~/infra/db/user/repo";
import { createLeaderboardRepository } from "~/infra/db/points/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { connect, fakeNotificationPort, fixedClock, truncateAll } from "./helpers";
import { first } from "../support";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);
const likeRepository = createLikeRepository(db);
const commentRepository = createCommentRepository(db);
const feedRepo = createFeedRepository(db);
const leaderboard = createLeaderboardRepository(db);
const feed = createFeedService({ feed: feedRepo });
const profiles = createUserService({ users });

afterAll(async () => {
  await client.end();
});
beforeEach(async () => {
  await truncateAll(db);
});

async function seedApprovedProof(clockAt = new Date("2026-09-18T12:00:00Z")) {
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const task = await tasks.create({
    title: "Sort the recycling",
    description: "",
    categoryId: category.id,
    points: 10,
    policy: "repeatable",
    cooldownSeconds: 0,
    photoRequired: false,
    photoInstructions: null,
  });

  const aliceUser = await users.upsertFromIdentity({
    ipaUniqueId: "ipa-alice",
    uid: "alice",
    displayName: "Alice",
    groups: ["members"],
  });
  const bobUser = await users.upsertFromIdentity({
    ipaUniqueId: "ipa-bob",
    uid: "bob",
    displayName: "Bob",
    groups: ["members"],
  });
  const bossUser = await users.upsertFromIdentity({
    ipaUniqueId: "ipa-boss",
    uid: "boss",
    displayName: "Boss",
    groups: ["team_juhatus"],
  });

  const proof = await proofs.createPendingProof({
    taskId: task.id,
    userId: aliceUser.id,
    photos: [],
    now: clockAt,
  });
  await proofs.approve({
    proofId: proof.id,
    reviewerId: bossUser.id,
    now: clockAt,
  });

  return {
    task,
    proof,
    alice: aliceUser,
    bob: bobUser,
    admin: bossUser,
  };
}

function service(clock = fixedClock(new Date("2026-09-18T12:00:00Z"))) {
  const notifications = fakeNotificationPort();

  return {
    notifications,
    clock,
    likes: createLikeService({
      likes: likeRepository,
      proofs,
      clock,
    }),
    comments: createCommentService({
      comments: commentRepository,
      proofs,
      notifications,
      clock,
    }),
  };
}

describe("likes", () => {
  it("toggles a like on and off", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { likes } = service();

    const liked = await likes.toggleLike(bob, proof.id);
    expect(liked).toEqual({
      liked: true,
      likeCount: 1,
    });

    const unliked = await likes.toggleLike(bob, proof.id);
    expect(unliked).toEqual({
      liked: false,
      likeCount: 0,
    });
  });

  it("counts one like per user no matter how many concurrent requests arrive", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { likes } = service();

    await Promise.all(
      Array.from({ length: 5 }, () => likes.toggleLike(bob, proof.id).catch(() => null)),
    );

    const [entry] = (await feed.listFeed(bob, { cursor: null })).entries;
    expect(entry?.likeCount).toBeLessThanOrEqual(1);
  });

  it("lets a signed-in account in no configured group like and comment", async () => {
    const { proof } = await seedApprovedProof();
    const { likes, comments } = service();
    const guest = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-guest",
      uid: "guest",
      displayName: "Guest",
      groups: ["ipausers"],
    });

    expect(guest.roles).toEqual([]);
    await expect(likes.toggleLike(guest, proof.id)).resolves.toEqual({
      liked: true,
      likeCount: 1,
    });
    await expect(
      comments.addComment(guest, {
        proofId: proof.id,
        body: "Nice work",
      }),
    ).resolves.toMatchObject({
      body: "Nice work",
    });
  });

  it("refuses a like from an unauthenticated visitor", async () => {
    const { proof } = await seedApprovedProof();
    const { likes } = service();
    await expect(likes.toggleLike(null, proof.id)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("refuses a like on a proof that is not approved", async () => {
    const { task, bob, alice } = await seedApprovedProof();
    const pending = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: new Date(),
    });

    const { likes } = service();
    await expect(likes.toggleLike(bob, pending.id)).rejects.toThrow(/completed tasks/i);
  });

  it("sends no notification for a like", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { likes, notifications } = service();

    await likes.toggleLike(bob, proof.id);
    expect(notifications.publish).not.toHaveBeenCalled();
  });

  it("does not affect points or leaderboard standing", async () => {
    const { proof, bob } = await seedApprovedProof();
    const before = await leaderboard.leaderboard();

    const { likes, comments } = service();
    await likes.toggleLike(bob, proof.id);
    await comments.addComment(bob, {
      proofId: proof.id,
      body: "Nice!",
    });

    expect(await leaderboard.leaderboard()).toEqual(before);
  });
});

describe("comments", () => {
  it("accepts a plain-text comment and notifies the proof owner", async () => {
    const { proof, bob, alice } = await seedApprovedProof();
    const { comments, notifications } = service();

    const comment = await comments.addComment(bob, {
      proofId: proof.id,
      body: "  Nice work!  ",
    });

    expect(comment.body).toBe("Nice work!");
    expect(notifications.publish).toHaveBeenCalledOnce();
    expect(notifications.publish.mock.calls[0]?.[0]).toMatchObject({
      recipientUserId: alice.id,
      type: "proof_commented",
    });
  });

  it("does not notify a user who comments on their own proof", async () => {
    const { proof, alice } = await seedApprovedProof();
    const { comments, notifications } = service();

    await comments.addComment(alice, {
      proofId: proof.id,
      body: "Note to self",
    });
    expect(notifications.publish).not.toHaveBeenCalled();
  });

  it("tells earlier commenters about a reply, but not the replier or the owner twice", async () => {
    const { proof, alice, bob, admin } = await seedApprovedProof();
    const { comments, notifications } = service();

    await comments.addComment(bob, {
      proofId: proof.id,
      body: "Nice work!",
    });
    await comments.addComment(admin, {
      proofId: proof.id,
      body: "Agreed",
    });
    await comments.addComment(bob, {
      proofId: proof.id,
      body: "Thanks",
    });

    const replies = notifications.publishMany.mock.calls.flatMap(([batch]) => [...batch]);
    expect(replies.map((reply) => [reply.recipientUserId, reply.title])).toEqual([
      [bob.id, "New reply"],
      [admin.id, "New reply"],
    ]);
    expect(replies.map((reply) => reply.recipientUserId)).not.toContain(alice.id);
  });

  it("refuses a comment from an unauthenticated visitor", async () => {
    const { proof } = await seedApprovedProof();
    const { comments } = service();

    await expect(
      comments.addComment(null, {
        proofId: proof.id,
        body: "hi",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("refuses an empty comment and one over the length limit", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { comments } = service();

    await expect(
      comments.addComment(bob, {
        proofId: proof.id,
        body: "   ",
      }),
    ).rejects.toThrow(/write something/i);

    await expect(
      comments.addComment(bob, {
        proofId: proof.id,
        body: "x".repeat(feedConfig.maxCommentLength + 1),
      }),
    ).rejects.toThrow(/limited to/i);
  });

  it("stores markup as literal text rather than rendering it", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { comments } = service();

    const body = '<script>alert("x")</script> **not bold**';
    const comment = await comments.addComment(bob, {
      proofId: proof.id,
      body,
    });
    expect(comment.body).toBe(body);
  });
});

describe("comment rate limiting", () => {
  it("blocks a user who exceeds the configured rate", async () => {
    const { proof, bob } = await seedApprovedProof();
    const clock = fixedClock(new Date("2026-09-18T12:00:00Z"));
    const { comments } = service(clock);

    for (let i = 0; i < feedConfig.commentRateLimit.maxComments; i += 1) {
      await comments.addComment(bob, {
        proofId: proof.id,
        body: `comment ${i}`,
      });
      clock.advanceSeconds(1);
    }

    await expect(
      comments.addComment(bob, {
        proofId: proof.id,
        body: "one too many",
      }),
    ).rejects.toThrow(/too quickly/i);
  });

  it("lets the user comment again once the window has passed", async () => {
    const { proof, bob } = await seedApprovedProof();
    const clock = fixedClock(new Date("2026-09-18T12:00:00Z"));
    const { comments } = service(clock);

    for (let i = 0; i < feedConfig.commentRateLimit.maxComments; i += 1) {
      await comments.addComment(bob, {
        proofId: proof.id,
        body: `comment ${i}`,
      });
    }
    await expect(
      comments.addComment(bob, {
        proofId: proof.id,
        body: "blocked",
      }),
    ).rejects.toThrow(/too quickly/i);

    clock.advanceSeconds(feedConfig.commentRateLimit.windowSeconds + 1);
    await expect(
      comments.addComment(bob, {
        proofId: proof.id,
        body: "allowed again",
      }),
    ).resolves.toBeDefined();
  });

  it("limits each user separately", async () => {
    const { proof, bob, alice } = await seedApprovedProof();
    const clock = fixedClock(new Date("2026-09-18T12:00:00Z"));
    const { comments } = service(clock);

    for (let i = 0; i < feedConfig.commentRateLimit.maxComments; i += 1) {
      await comments.addComment(bob, {
        proofId: proof.id,
        body: `comment ${i}`,
      });
    }

    await expect(
      comments.addComment(alice, {
        proofId: proof.id,
        body: "mine",
      }),
    ).resolves.toBeDefined();
  });
});

describe("comment moderation", () => {
  it("lets a user delete their own comment", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { comments } = service();

    const comment = await comments.addComment(bob, {
      proofId: proof.id,
      body: "oops",
    });
    await comments.deleteComment(bob, comment.id);

    const stored = first(await commentRepository.listComments(proof.id));
    expect(stored.deletedAt).not.toBeNull();
    expect(stored.body).toBe("[comment removed]");
  });

  it("stops a user deleting someone else's comment", async () => {
    const { proof, bob, alice } = await seedApprovedProof();
    const { comments } = service();

    const comment = await comments.addComment(bob, {
      proofId: proof.id,
      body: "mine",
    });
    await expect(comments.deleteComment(alice, comment.id)).rejects.toThrow(
      /only delete your own/i,
    );
  });

  it("lets an admin delete anyone's comment", async () => {
    const { proof, bob, admin } = await seedApprovedProof();
    const { comments } = service();

    const comment = await comments.addComment(bob, {
      proofId: proof.id,
      body: "spam",
    });
    await expect(comments.deleteComment(admin, comment.id)).resolves.toBeUndefined();
  });

  it("refuses deletion by an unauthenticated visitor", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { comments } = service();

    const comment = await comments.addComment(bob, {
      proofId: proof.id,
      body: "hi",
    });
    await expect(comments.deleteComment(null, comment.id)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("excludes deleted comments from the feed's comment count", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { comments } = service();

    const firstComment = await comments.addComment(bob, {
      proofId: proof.id,
      body: "one",
    });
    await comments.addComment(bob, {
      proofId: proof.id,
      body: "two",
    });
    await comments.deleteComment(bob, firstComment.id);

    const [entry] = (await feed.listFeed(bob, { cursor: null })).entries;
    expect(entry?.commentCount).toBe(1);
  });
});

describe("public feed reading", () => {
  it("is readable without authentication", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { likes, comments } = service();
    await likes.toggleLike(bob, proof.id);
    await comments.addComment(bob, {
      proofId: proof.id,
      body: "Well done",
    });

    const page = await feed.listFeed(null, { cursor: null });

    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.likeCount).toBe(1);
    expect(page.entries[0]?.commentCount).toBe(1);
    expect(page.entries[0]?.likedByUser).toBe(false);
  });

  it("shows the user their own like state", async () => {
    const { proof, bob } = await seedApprovedProof();
    const { likes } = service();
    await likes.toggleLike(bob, proof.id);

    const page = await feed.listFeed(bob, { cursor: null });
    expect(page.entries[0]?.likedByUser).toBe(true);
  });

  it("exposes no uid, FreeIPA attributes, or object keys", async () => {
    await seedApprovedProof();
    const page = await feed.listFeed(null, { cursor: null });
    const serialised = JSON.stringify(page);

    expect(serialised).not.toContain("ipa-alice");
    expect(serialised).not.toContain('"uid"');
    expect(serialised).not.toContain("photos/");
  });

  it("never includes pending or rejected proofs", async () => {
    const { task, alice, admin } = await seedApprovedProof();

    const pending = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: new Date(),
    });
    const rejected = await proofs.createPendingProof({
      taskId: task.id,
      userId: admin.id,
      photos: [],
      now: new Date(),
    });
    await proofs.reject({
      proofId: rejected.id,
      reviewerId: admin.id,
      reason: null,
      now: new Date(),
    });

    const page = await feed.listFeed(null, { cursor: null });
    const ids = page.entries.map((e) => e.proofId);
    expect(ids).not.toContain(pending.id);
    expect(ids).not.toContain(rejected.id);
  });
});

describe("user pages", () => {
  it("lists only the chosen user's approved proofs", async () => {
    const { proof, alice, bob } = await seedApprovedProof();

    const alicesProofs = await feed.listFeed(null, {
      cursor: null,
      authorId: alice.id,
    });
    const bobsProofs = await feed.listFeed(null, {
      cursor: null,
      authorId: bob.id,
    });

    expect(alicesProofs.entries.map((entry) => entry.proofId)).toEqual([proof.id]);
    expect(bobsProofs.entries).toEqual([]);
  });

  it("shows anyone's public profile to visitors, and nothing for an unknown id", async () => {
    const { alice } = await seedApprovedProof();

    expect(await profiles.findProfile(null, alice.id)).toEqual({
      id: alice.id,
      displayName: "Alice",
    });
    expect(await profiles.findProfile(null, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});
