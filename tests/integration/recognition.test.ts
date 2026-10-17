import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createCommentService } from "~/core/services/comment";
import { createLikeService } from "~/core/services/like";
import { createRecognitionService } from "~/core/services/recognition";
import { recognitionFilter } from "~/domain/feed";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createCommentRepository } from "~/infra/db/feed/comment";
import { createLikeRepository } from "~/infra/db/feed/like";
import { createFeedRepository } from "~/infra/db/feed/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createLeaderboardRepository } from "~/infra/db/points/repo";
import { pointsLedger } from "~/infra/db/points/model";
import { createRecognitionRepository } from "~/infra/db/recognition/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { connect, fakeNotificationPort, seedUsers, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const recognitions = createRecognitionRepository(db, ["members", "pixels"]);
const now = new Date("2026-10-16T12:00:00Z");
const service = createRecognitionService({
  recognitions,
  clock: { now: () => now },
});
const feed = createFeedRepository(db);
const leaderboard = createLeaderboardRepository(db);

afterAll(async () => client.end());
beforeEach(async () => truncateAll(db));

describe("contribution recognition", () => {
  it("publishes recognition, selected badge imagery, links, and points atomically", async () => {
    const { admin, alice } = await seedUsers(users);
    const badge = await service.createBadge(admin, {
      label: "Community Builder",
      imageUrl: "https://example.org/community-builder.png",
    });
    await service.publish(admin, {
      recipientId: alice.id,
      description: "Organized the community meetup and welcomed new members.",
      points: 12,
      badgeIds: [badge.id],
      links: [
        {
          title: "Event recap",
          url: "https://example.org/recap",
        },
      ],
    });

    const entries = await db.select().from(pointsLedger).where(eq(pointsLedger.userId, alice.id));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      proofId: null,
      points: 12,
      awardedAt: now,
      createdAt: now,
    });
    expect(entries[0]?.recognitionId).toBeTruthy();
    expect(
      await leaderboard.leaderboard({ since: new Date("2026-10-01T00:00:00Z") }),
    ).toMatchObject([
      {
        user: { id: alice.id },
        totalPoints: 12,
        approvedProofs: 0,
      },
    ]);

    const page = await feed.listFeed({
      cursor: null,
      limit: 10,
      includeExcludedAuthor: false,
      viewerId: null,
    });
    expect(page.entries[0]).toMatchObject({
      kind: "recognition",
      user: { id: alice.id },
      reviewer: { id: admin.id },
      points: 12,
      recognitionDescription: "Organized the community meetup and welcomed new members.",
      badges: [
        {
          id: badge.id,
          label: "Community Builder",
          imageUrl: "https://example.org/community-builder.png",
        },
      ],
      achievementLinks: [
        {
          title: "Event recap",
          url: "https://example.org/recap",
        },
      ],
    });
  });

  it("shows every earned badge once on the profile and on each of the member's posts", async () => {
    const { admin, alice } = await seedUsers(users);
    const badge = await service.createBadge(admin, {
      label: "Helper",
      imageUrl: null,
    });
    for (const badgeIds of [[badge.id], [badge.id], []]) {
      await service.publish(admin, {
        recipientId: alice.id,
        description: "Helped out.",
        points: 1,
        badgeIds,
        links: [],
      });
    }

    const earned = [
      {
        id: badge.id,
        label: "Helper",
        imageUrl: null,
      },
    ];
    expect(await service.listEarnedBadges(null, alice.id)).toEqual(earned);
    const page = await feed.listFeed({
      cursor: null,
      limit: 10,
      includeExcludedAuthor: false,
      viewerId: null,
    });
    expect(page.entries).toHaveLength(3);
    expect(page.entries.map(({ authorBadges }) => authorBadges)).toEqual([earned, earned, earned]);
  });

  it("lets members like and comment on a recognition and notifies the recipient", async () => {
    const { admin, alice, bob } = await seedUsers(users);
    await service.publish(admin, {
      recipientId: alice.id,
      description: "Ran the workshop.",
      points: 2,
      badgeIds: [],
      links: [],
    });
    const [post] = (
      await feed.listFeed({
        cursor: null,
        limit: 10,
        includeExcludedAuthor: false,
        viewerId: null,
      })
    ).entries;
    const notifications = fakeNotificationPort();
    const deps = {
      proofs: createProofRepository(db),
      recognitions,
      clock: { now: () => now },
    };
    const likes = createLikeService({
      ...deps,
      likes: createLikeRepository(db),
    });
    const comments = createCommentService({
      ...deps,
      comments: createCommentRepository(db),
      notifications,
    });
    const postId = post?.proofId ?? "";

    expect(await likes.toggleLike(bob, postId)).toEqual({
      liked: true,
      likeCount: 1,
    });
    await comments.addComment(bob, {
      proofId: postId,
      body: "Great workshop!",
    });
    expect(await comments.listComments(null, postId)).toMatchObject([{ body: "Great workshop!" }]);
    expect(notifications.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: alice.id,
        proofId: null,
      }),
    );
    expect(
      (
        await feed.listFeed({
          cursor: null,
          limit: 10,
          includeExcludedAuthor: false,
          viewerId: bob.id,
        })
      ).entries[0],
    ).toMatchObject({
      likeCount: 1,
      commentCount: 1,
      likedByUser: true,
    });
  });

  it("shows recognitions under their own feed filter and not under task categories", async () => {
    const { admin, alice } = await seedUsers(users);
    const category = await createCategoryRepository(db).create({
      name: "General",
      slug: "general",
    });
    await service.publish(admin, {
      recipientId: alice.id,
      description: "Fixed the **projector**.",
      descriptionMarkdown: true,
      points: 3,
      badgeIds: [],
      links: [],
    });
    const list = (categoryId: string) =>
      feed.listFeed({
        cursor: null,
        limit: 10,
        categoryId,
        includeExcludedAuthor: false,
        viewerId: null,
      });

    expect((await list(recognitionFilter)).entries).toMatchObject([
      {
        kind: "recognition",
        textMarkdown: true,
      },
    ]);
    expect((await list(category.id)).entries).toEqual([]);
  });

  it("rejects self-recognition and unsafe achievement URLs without creating points", async () => {
    const { admin, alice } = await seedUsers(users);
    await expect(
      service.publish(admin, {
        recipientId: admin.id,
        description: "Self recognition",
        points: 5,
        badgeIds: [],
        links: [],
      }),
    ).rejects.toThrow("You cannot recognize yourself.");
    await expect(
      service.publish(admin, {
        recipientId: alice.id,
        description: "Unsafe link",
        points: 5,
        badgeIds: [],
        links: [
          {
            title: "Bad",
            url: "javascript:alert(1)",
          },
        ],
      }),
    ).rejects.toThrow("safe http or https");
    expect(await db.select().from(pointsLedger)).toEqual([]);
  });

  it("only offers non-excluded members as recognition recipients", async () => {
    const { admin, alice, outsider } = await seedUsers(users);
    await users.setExcluded({
      userId: alice.id,
      excluded: true,
    });
    const eligible = await recognitions.listEligibleRecipients();
    expect(eligible.map(({ id }) => id)).not.toContain(alice.id);
    expect(eligible.map(({ id }) => id)).not.toContain(outsider.id);
    await expect(
      service.publish(admin, {
        recipientId: outsider.id,
        description: "Not a member",
        points: 1,
        badgeIds: [],
        links: [],
      }),
    ).rejects.toThrow();
  });

  it("rejects duplicate badge names and invalid badge image schemes", async () => {
    const { admin } = await seedUsers(users);
    await service.createBadge(admin, {
      label: "Helpful",
      imageUrl: null,
    });
    await expect(
      service.createBadge(admin, {
        label: "helpful",
        imageUrl: null,
      }),
    ).rejects.toThrow("already exists");
    await expect(
      service.createBadge(admin, {
        label: "Unsafe",
        imageUrl: "javascript:alert(1)",
      }),
    ).rejects.toThrow("http or https");
  });
});
