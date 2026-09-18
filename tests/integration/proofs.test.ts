import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TaskPolicy } from "~/domain/task";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createUserRepository } from "~/infra/db/user/repo";
import { createLeaderboardRepository } from "~/infra/db/points/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { connect, seedUsers, truncateAll } from "./helpers";
import { first } from "../support";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);
const leaderboard = createLeaderboardRepository(db);

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  await truncateAll(db);
});

async function seed(
  policy: TaskPolicy,
  overrides: Partial<{
    points: number;
    photoRequired: boolean;
    cooldownSeconds: number | null;
  }> = {},
) {
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const task = await tasks.create({
    title: "Take out the trash",
    description: "",
    categoryId: category.id,
    points: overrides.points ?? 10,
    policy,
    cooldownSeconds: overrides.cooldownSeconds ?? null,
    photoRequired: overrides.photoRequired ?? false,
    photoInstructions: null,
  });

  return {
    task,
    ...(await seedUsers(users)),
  };
}

const now = () => new Date();

describe("proof creation", () => {
  it("creates a pending proof that awards no points", async () => {
    const { task, alice } = await seed("one_per_user");

    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });

    expect(proof.status).toBe("pending");
    expect(await leaderboard.leaderboard()).toEqual([]);
  });

  it("prevents a duplicate pending proof by the same user", async () => {
    const { task, alice } = await seed("one_per_user");
    const input = {
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    };

    await proofs.createPendingProof(input);
    await expect(proofs.createPendingProof(input)).rejects.toThrow(/awaiting review/i);
  });

  it("reserves a single_winner task while a proof is pending", async () => {
    const { task, alice, bob } = await seed("single_winner");

    await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });

    await expect(
      proofs.createPendingProof({
        taskId: task.id,
        userId: bob.id,
        photos: [],
        now: now(),
      }),
    ).rejects.toThrow(/already taken/i);
  });

  it("releases a single_winner task when the pending proof is rejected", async () => {
    const { task, alice, bob, admin } = await seed("single_winner");

    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });
    await proofs.reject({
      proofId: proof.id,
      reviewerId: admin.id,
      reason: "Not done properly",
      now: now(),
    });

    const retry = await proofs.createPendingProof({
      taskId: task.id,
      userId: bob.id,
      photos: [],
      now: now(),
    });
    expect(retry.status).toBe("pending");
  });

  it("lets a rejected user retry the same task", async () => {
    const { task, alice, admin } = await seed("one_per_user");

    const firstProof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });
    await proofs.reject({
      proofId: firstProof.id,
      reviewerId: admin.id,
      reason: null,
      now: now(),
    });

    const secondProof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });
    expect(secondProof.status).toBe("pending");
  });

  it("refuses a proof on an archived task", async () => {
    const { task, alice } = await seed("one_per_user");
    await tasks.setArchived(task.id, true);

    await expect(
      proofs.createPendingProof({
        taskId: task.id,
        userId: alice.id,
        photos: [],
        now: now(),
      }),
    ).rejects.toThrow(/archived/i);
  });

  it("allows repeat approved proofs on a repeatable task", async () => {
    const { task, alice, admin } = await seed("repeatable", { cooldownSeconds: 0 });

    const firstProof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });
    await proofs.approve({
      proofId: firstProof.id,
      reviewerId: admin.id,
      now: now(),
    });

    const secondProof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });
    expect(secondProof.status).toBe("pending");
  });
});

describe("tasks that require photos", () => {
  it("refuses a proof without photos on a task that requires them, leaving nothing behind", async () => {
    const { task, alice } = await seed("one_per_user", { photoRequired: true });

    await expect(
      proofs.createPendingProof({
        taskId: task.id,
        userId: alice.id,
        photos: [],
        now: now(),
      }),
    ).rejects.toThrow(/requires at least one photo/i);

    expect(await proofs.listForUser(alice.id)).toEqual([]);
  });

  it("creates the proof and its photos together", async () => {
    const { task, alice } = await seed("one_per_user", { photoRequired: true });

    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [
        {
          objectKey: `photos/${alice.id}/draft/photo.jpg`,
          contentType: "image/jpeg",
          sizeBytes: 2048,
        },
      ],
      now: now(),
    });

    const photos = await proofs.listPhotos(proof.id);
    expect(photos).toHaveLength(1);
    expect(photos[0]?.contentType).toBe("image/jpeg");
  });
});

describe("approval and point awards", () => {
  it("awards points only on approval", async () => {
    const { task, alice, admin } = await seed("one_per_user", { points: 25 });

    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });
    expect(await leaderboard.leaderboard()).toEqual([]);

    const result = await proofs.approve({
      proofId: proof.id,
      reviewerId: admin.id,
      now: now(),
    });

    expect(result.pointsAwarded).toBe(25);
    const rows = await leaderboard.leaderboard();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.totalPoints).toBe(25);
  });

  it("counts only points awarded since a given moment", async () => {
    const { task, alice, admin } = await seed("one_per_user", { points: 25 });
    const approvedAt = new Date("2026-08-31T21:30:00Z");
    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: approvedAt,
    });
    await proofs.approve({
      proofId: proof.id,
      reviewerId: admin.id,
      now: approvedAt,
    });

    expect(await leaderboard.leaderboard({ since: new Date("2026-08-01T00:00:00Z") })).toHaveLength(
      1,
    );
    expect(await leaderboard.leaderboard({ since: new Date("2026-09-01T00:00:00Z") })).toEqual([]);
  });

  it("awards nothing on rejection", async () => {
    const { task, alice, admin } = await seed("one_per_user", { points: 25 });

    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });
    await proofs.reject({
      proofId: proof.id,
      reviewerId: admin.id,
      reason: "Missing photo",
      now: now(),
    });

    expect(await leaderboard.leaderboard()).toEqual([]);
  });

  it("is idempotent when the same proof is approved twice", async () => {
    const { task, alice, admin } = await seed("one_per_user", { points: 25 });
    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });

    const firstApproval = await proofs.approve({
      proofId: proof.id,
      reviewerId: admin.id,
      now: now(),
    });
    const secondApproval = await proofs.approve({
      proofId: proof.id,
      reviewerId: admin.id,
      now: now(),
    });

    expect(firstApproval.alreadyReviewed).toBe(false);
    expect(secondApproval.alreadyReviewed).toBe(true);
    expect(secondApproval.pointsAwarded).toBe(0);

    const rows = await leaderboard.leaderboard();
    expect(rows[0]?.totalPoints).toBe(25);
  });

  it("awards points once when concurrent approvals race", async () => {
    const { task, alice, admin } = await seed("one_per_user", { points: 25 });
    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });

    const results = await Promise.all([
      proofs.approve({
        proofId: proof.id,
        reviewerId: admin.id,
        now: now(),
      }),
      proofs.approve({
        proofId: proof.id,
        reviewerId: admin.id,
        now: now(),
      }),
    ]);

    const awarded = results.filter((r) => !r.alreadyReviewed);
    expect(awarded).toHaveLength(1);

    const rows = await leaderboard.leaderboard();
    expect(rows[0]?.totalPoints).toBe(25);
    expect(rows[0]?.approvedProofs).toBe(1);
  });

  it("cannot approve a proof that was already rejected", async () => {
    const { task, alice, admin } = await seed("one_per_user");
    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });

    await proofs.reject({
      proofId: proof.id,
      reviewerId: admin.id,
      reason: null,
      now: now(),
    });
    const result = await proofs.approve({
      proofId: proof.id,
      reviewerId: admin.id,
      now: now(),
    });

    expect(result.alreadyReviewed).toBe(true);
    expect(result.proof.status).toBe("rejected");
    expect(await leaderboard.leaderboard()).toEqual([]);
  });
});

describe("leaderboard ordering", () => {
  it("sorts by points descending, then display name ascending", async () => {
    const category = await categories.create({
      name: "General",
      slug: "general",
    });
    const task = await tasks.create({
      title: "Task",
      description: "",
      categoryId: category.id,
      points: 10,
      policy: "repeatable",
      cooldownSeconds: 0,
      photoRequired: false,
      photoInstructions: null,
    });

    const people = [
      {
        uid: "zoe",
        name: "Zoe",
        approvals: 1,
      },
      {
        uid: "ann",
        name: "Ann",
        approvals: 1,
      },
      {
        uid: "max",
        name: "Max",
        approvals: 3,
      },
    ];

    for (const person of people) {
      const user = await users.upsertFromIdentity({
        ipaUniqueId: `ipa-${person.uid}`,
        uid: person.uid,
        displayName: person.name,
        groups: ["members"],
      });
      for (let i = 0; i < person.approvals; i += 1) {
        const proof = await proofs.createPendingProof({
          taskId: task.id,
          userId: user.id,
          photos: [],
          now: now(),
        });
        await proofs.approve({
          proofId: proof.id,
          reviewerId: user.id,
          now: now(),
        });
      }
    }

    const rows = await leaderboard.leaderboard();
    expect(rows.map((r) => r.user.displayName)).toEqual(["Max", "Ann", "Zoe"]);
    expect(rows.map((r) => r.totalPoints)).toEqual([30, 10, 10]);
  });

  it("exposes no internal identifiers or FreeIPA attributes", async () => {
    const { task, alice, admin } = await seed("one_per_user");
    const proof = await proofs.createPendingProof({
      taskId: task.id,
      userId: alice.id,
      photos: [],
      now: now(),
    });
    await proofs.approve({
      proofId: proof.id,
      reviewerId: admin.id,
      now: now(),
    });

    const row = first(await leaderboard.leaderboard());
    expect(Object.keys(row.user).sort()).toEqual(["displayName", "id"]);
    expect(JSON.stringify(row)).not.toContain("ipa-alice");
    expect(JSON.stringify(row)).not.toContain("alice");
  });
});
