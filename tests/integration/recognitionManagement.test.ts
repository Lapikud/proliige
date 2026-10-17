import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createCommentService } from "~/core/services/comment";
import { createFeedService } from "~/core/services/feed";
import { createLikeService } from "~/core/services/like";
import { createRecognitionService } from "~/core/services/recognition";
import { createCommentRepository } from "~/infra/db/feed/comment";
import { createLikeRepository } from "~/infra/db/feed/like";
import { createFeedRepository } from "~/infra/db/feed/repo";
import { createLeaderboardRepository } from "~/infra/db/points/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createRecognitionRepository } from "~/infra/db/recognition/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { connect, fakeNotificationPort, seedUsers, truncateAll } from "./helpers";

const { client, db } = connect();
const users = createUserRepository(db);
const recognitions = createRecognitionRepository(db, ["members", "pixels"]);
const proofs = createProofRepository(db);
const clock = { now: () => new Date() };
const service = createRecognitionService({
  recognitions,
  clock,
});
const feed = createFeedService({ feed: createFeedRepository(db) });
const leaderboard = createLeaderboardRepository(db);
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
  notifications: fakeNotificationPort(),
  clock,
});

afterAll(async () => client.end());
beforeEach(async () => truncateAll(db));

async function seed() {
  const people = await seedUsers(users);
  const badge = await service.createBadge(people.admin, {
    label: "Mentor",
    imageUrl: null,
  });
  await service.publish(people.admin, {
    recipientId: people.alice.id,
    description: "Ran the soldering workshop.",
    points: 30,
    badgeIds: [badge.id],
    links: [],
  });
  const [entry] = (await feed.listFeed(people.admin, { cursor: null })).entries;
  if (!entry) throw new Error("The recognition is missing from the feed.");

  return {
    ...people,
    badge,
    id: entry.proofId,
  };
}

const totals = async (since: Date | null = null) =>
  (await leaderboard.leaderboard({ since }))[0]?.totalPoints ?? 0;

describe("managing a recognition", () => {
  it("edits the text, badges and links but keeps the points", async () => {
    const { admin, id } = await seed();

    await service.update(admin, id, {
      description: "Ran the soldering workshop twice.",
      descriptionMarkdown: true,
      badgeIds: [],
      links: [
        {
          title: "Slides",
          url: "https://example.org/slides",
        },
      ],
    });

    const [entry] = (await feed.listFeed(admin, { cursor: null })).entries;
    expect(entry).toMatchObject({
      recognitionDescription: "Ran the soldering workshop twice.",
      textMarkdown: true,
      badges: [],
      achievementLinks: [
        {
          title: "Slides",
          url: "https://example.org/slides",
        },
      ],
      points: 30,
    });
    expect(await totals()).toBe(30);
  });

  it("removes it from the feed for everyone but admins, keeping the points", async () => {
    const { admin, bob, id } = await seed();

    await service.setHidden(admin, id, true);

    expect((await feed.listFeed(bob, { cursor: null })).entries).toEqual([]);
    const [shownToAdmin] = (await feed.listFeed(admin, { cursor: null })).entries;
    expect(shownToAdmin).toMatchObject({
      proofId: id,
      offFeed: "removed",
    });
    expect(await totals()).toBe(30);
    await expect(likes.toggleLike(bob, id)).rejects.toThrow(/not on the feed/);
    await expect(
      comments.addComment(bob, {
        proofId: id,
        body: "Nice",
      }),
    ).rejects.toThrow(/not on the feed/);

    await service.setHidden(admin, id, false);
    expect((await feed.listFeed(bob, { cursor: null })).entries).toHaveLength(1);
  });

  it("takes the points and badge back once, this month too", async () => {
    const { admin, alice, id } = await seed();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    await service.takeBack(admin, id);
    await service.takeBack(admin, id);

    expect(await totals()).toBe(0);
    expect(await totals(monthStart)).toBe(0);
    expect((await feed.listFeed(admin, { cursor: null })).entries).toEqual([]);
    expect(await recognitions.listEarnedBadges(alice.id)).toEqual([]);
    await expect(
      service.update(admin, id, {
        description: "Again",
        badgeIds: [],
        links: [],
      }),
    ).rejects.toThrow(/taken back/);
  });

  it("does not count a taken-back recognition against tasks done", async () => {
    const { admin, id } = await seed();

    await service.takeBack(admin, id);

    expect((await leaderboard.leaderboard())[0]?.approvedProofs).toBe(0);
  });

  it("is for admins only", async () => {
    const { alice, id } = await seed();

    await expect(service.setHidden(alice, id, true)).rejects.toThrow();
    await expect(service.takeBack(alice, id)).rejects.toThrow();
    await expect(
      service.update(alice, id, {
        description: "Mine now",
        badgeIds: [],
        links: [],
      }),
    ).rejects.toThrow();
  });
});
