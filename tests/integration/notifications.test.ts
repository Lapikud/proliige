import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { accessConfig } from "~/config/access";
import { createProofService } from "~/core/services/proof";
import { createPhotoService } from "~/core/services/photo";
import { createNotificationService } from "~/core/services/notification";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createProofRepository } from "~/infra/db/proof/repo";
import { createAdminDirectory } from "~/infra/db/user/admin";
import { createUserRepository } from "~/infra/db/user/repo";
import { createNotificationAdapter } from "~/infra/db/notification/repo";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import { connect, seedUsers, truncateAll } from "./helpers";
import { first } from "../support";

const { client, db } = connect();
const users = createUserRepository(db);
const categories = createCategoryRepository(db);
const tasks = createTaskRepository(db);
const proofs = createProofRepository(db);

const notificationPort = createNotificationAdapter(db);
const adminDirectory = createAdminDirectory(db, accessConfig.adminGroups);
const notificationService = createNotificationService({
  notifications: notificationPort,
  push: {
    save: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    send: () => Promise.resolve(),
  },
});

afterAll(async () => {
  await client.end();
});
beforeEach(async () => {
  await truncateAll(db);
});

const clock = {
  now: () => new Date(),
};

const proofService = createProofService({
  proofs,
  tasks,
  photos: createPhotoService({
    storage: createMemoryObjectStorage(),
    proofs,
  }),
  notifications: notificationPort,
  admins: adminDirectory,
  clock,
});

async function seed() {
  const category = await categories.create({
    name: "General",
    slug: "general",
  });
  const task = await tasks.create({
    title: "Restock the fridge",
    description: "",
    categoryId: category.id,
    points: 15,
    policy: "repeatable",
    cooldownSeconds: 0,
    photoRequired: false,
    photoInstructions: null,
  });

  return {
    task,
    ...(await seedUsers(users)),
  };
}

describe("admin directory", () => {
  it("resolves admins by configured group, never by name", async () => {
    const { admin, alice } = await seed();
    const ids = (await adminDirectory.listAdmins()).map((each) => each.id);

    expect(ids).toEqual([admin.id]);
    expect(ids).not.toContain(alice.id);
  });

  it("returns nobody when no user is in an admin group", async () => {
    await users.upsertFromIdentity({
      ipaUniqueId: "ipa-nobody",
      uid: "nobody",
      displayName: "Nobody",
      groups: ["ipausers"],
    });
    expect(await adminDirectory.listAdmins()).toEqual([]);
  });

  it("picks up a group change on the user's next login", async () => {
    const { alice } = await seed();
    expect(await adminDirectory.listAdmins()).not.toContainEqual({
      id: alice.id,
      displayName: "Alice",
    });

    await users.upsertFromIdentity({
      ipaUniqueId: "ipa-alice",
      uid: "alice",
      displayName: "Alice",
      groups: ["members", "team_juhatus"],
    });

    expect(await adminDirectory.listAdmins()).toContainEqual({
      id: alice.id,
      displayName: "Alice",
    });
  });
});

describe("proof submission", () => {
  it("notifies nobody when no reviewer is requested; the proof still waits for review", async () => {
    const { task, alice, admin } = await seed();

    await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });

    expect(await notificationPort.list(admin.id)).toEqual([]);
    expect(await proofService.listPendingProofs(admin)).toHaveLength(1);
  });

  it("delivers a review request live to a subscribed reviewer", async () => {
    const { task, alice, admin } = await seed();

    const received: Array<string> = [];
    const unsubscribe = notificationPort.subscribe(admin.id, (n) => received.push(n.type));

    await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
      reviewerIds: [admin.id],
    });
    unsubscribe();

    expect(received).toEqual(["review_requested"]);
  });

  it("does not deliver one user's notification to another subscriber", async () => {
    const { task, alice, bob, admin } = await seed();

    const bobsFeed: Array<string> = [];
    const unsubscribe = notificationPort.subscribe(bob.id, (n) => bobsFeed.push(n.type));

    await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
      reviewerIds: [admin.id],
    });
    unsubscribe();

    expect(bobsFeed).toEqual([]);
    expect(await notificationPort.list(bob.id)).toEqual([]);
    expect(await notificationPort.list(admin.id)).toHaveLength(1);
  });

  it("stops delivering after unsubscribe", async () => {
    const { task, alice, admin } = await seed();
    const received: Array<string> = [];
    const unsubscribe = notificationPort.subscribe(admin.id, (n) => received.push(n.type));
    unsubscribe();

    await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
      reviewerIds: [admin.id],
    });
    expect(received).toEqual([]);
  });
});

describe("requesting reviewers", () => {
  async function seedWithSecondAdmin() {
    const seeded = await seed();
    const carol = await users.upsertFromIdentity({
      ipaUniqueId: "ipa-carol",
      uid: "carol",
      displayName: "Carol",
      groups: ["team_juhatus"],
    });

    return {
      ...seeded,
      carol,
    };
  }

  it("asks only the requested reviewer, and records them on the proof", async () => {
    const { task, alice, admin, carol } = await seedWithSecondAdmin();

    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
      reviewerIds: [carol.id],
    });

    expect(await notificationPort.list(carol.id)).toMatchObject([
      {
        type: "review_requested",
        message: 'Alice asked you to review "Restock the fridge".',
      },
    ]);
    expect(await notificationPort.list(admin.id)).toEqual([]);
    expect((await proofs.findWithContext(proof.id))?.requestedReviewers).toEqual([
      {
        id: carol.id,
        displayName: "Carol",
      },
    ]);
  });

  it("still lets any admin approve a proof with a requested reviewer", async () => {
    const { task, alice, admin, carol } = await seedWithSecondAdmin();
    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
      reviewerIds: [carol.id],
    });

    await proofService.approveProof(admin, proof.id);

    expect(await proofs.findWithContext(proof.id)).toMatchObject({
      proof: { status: "approved" },
      reviewedByName: "Boss",
    });
  });

  it("refuses a reviewer who is not an admin, and submits nothing", async () => {
    const { task, alice, bob } = await seedWithSecondAdmin();

    await expect(
      proofService.submitProof(alice, {
        taskId: task.id,
        objectKeys: [],
        reviewerIds: [bob.id],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await proofs.listForUser(alice.id)).toEqual([]);
  });

  it("lists every admin as a possible reviewer, by name", async () => {
    const { alice, admin, carol } = await seedWithSecondAdmin();

    expect(await proofService.listReviewers(alice)).toEqual([
      {
        id: admin.id,
        displayName: "Boss",
      },
      {
        id: carol.id,
        displayName: "Carol",
      },
    ]);
  });
});

describe("review notifications", () => {
  it("notifies the user on approval, with the points awarded", async () => {
    const { task, alice, admin } = await seed();
    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });

    await proofService.approveProof(admin, proof.id);

    const inbox = await notificationPort.list(alice.id);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.type).toBe("proof_approved");
    expect(inbox[0]?.message).toContain("15");
  });

  it("notifies the user on rejection, including the reason", async () => {
    const { task, alice, admin } = await seed();
    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });

    await proofService.rejectProof(admin, {
      proofId: proof.id,
      reason: "Fridge empty",
    });

    const inbox = await notificationPort.list(alice.id);
    expect(inbox[0]?.type).toBe("proof_rejected");
    expect(inbox[0]?.message).toContain("Fridge empty");
  });

  it("sends only one notification when a proof is approved twice", async () => {
    const { task, alice, admin } = await seed();
    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });

    await proofService.approveProof(admin, proof.id);
    await proofService.approveProof(admin, proof.id);

    const approvals = (await notificationPort.list(alice.id)).filter(
      (n) => n.type === "proof_approved",
    );
    expect(approvals).toHaveLength(1);
  });
});

describe("notification reads are recipient-scoped", () => {
  async function twoInboxes() {
    const { task, alice, bob, admin } = await seed();
    const aliceProof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });
    await proofService.approveProof(admin, aliceProof.id);

    const bobProof = await proofService.submitProof(bob, {
      taskId: task.id,
      objectKeys: [],
    });
    await proofService.rejectProof(admin, {
      proofId: bobProof.id,
      reason: null,
    });

    return {
      alice,
      bob,
      admin,
    };
  }

  it("counts only the user's unread notifications", async () => {
    const { alice, bob } = await twoInboxes();
    expect(await notificationService.countUnreadNotifications(alice)).toBe(1);
    expect(await notificationService.countUnreadNotifications(bob)).toBe(1);
  });

  it("lists only the user's notifications", async () => {
    const { alice } = await twoInboxes();
    const list = await notificationService.listNotifications(alice);
    expect(list.every((n) => n.recipientUserId === alice.id)).toBe(true);
  });

  it("refuses to read notifications without authentication", async () => {
    await twoInboxes();
    await expect(notificationService.listNotifications(null)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    await expect(notificationService.countUnreadNotifications(null)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("will not let one user mark another user's notification read", async () => {
    const { alice, bob } = await twoInboxes();
    const alicesNotification = first(await notificationPort.list(alice.id));

    await notificationService.markNotificationRead(bob, alicesNotification.id);

    expect(await notificationService.countUnreadNotifications(alice)).toBe(1);
  });

  it("marks the user's own notification read", async () => {
    const { alice } = await twoInboxes();
    const notification = first(await notificationPort.list(alice.id));

    await notificationService.markNotificationRead(alice, notification.id);
    expect(await notificationService.countUnreadNotifications(alice)).toBe(0);
  });

  it("marks all of the user's notifications read, and nobody else's", async () => {
    const { alice, bob } = await twoInboxes();

    await notificationService.markAllNotificationsRead(alice);

    expect(await notificationService.countUnreadNotifications(alice)).toBe(0);
    expect(await notificationService.countUnreadNotifications(bob)).toBe(1);
  });
});

describe("reconnect replay", () => {
  it("returns only notifications newer than the last event the client saw", async () => {
    const { task, alice, admin } = await seed();

    const firstProof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });
    await proofService.approveProof(admin, firstProof.id);
    const seen = first(await notificationPort.list(alice.id));

    const second = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });
    await proofService.rejectProof(admin, {
      proofId: second.id,
      reason: "No",
    });

    const missed = await notificationPort.since(alice.id, seen.id);
    expect(missed).toHaveLength(1);
    expect(missed[0]?.type).toBe("proof_rejected");
  });

  it("returns nothing when the client is already up to date", async () => {
    const { task, alice, admin } = await seed();
    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });
    await proofService.approveProof(admin, proof.id);

    const latest = first(await notificationPort.list(alice.id));
    expect(await notificationPort.since(alice.id, latest.id)).toEqual([]);
  });

  it("replays nothing for an unknown event id rather than resending everything", async () => {
    const { task, alice, admin } = await seed();
    const proof = await proofService.submitProof(alice, {
      taskId: task.id,
      objectKeys: [],
    });
    await proofService.approveProof(admin, proof.id);

    const unknown = "00000000-0000-0000-0000-000000000000";
    expect(await notificationPort.since(alice.id, unknown)).toEqual([]);
  });
});
