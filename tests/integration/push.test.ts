import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { WebPushError } from "web-push";
import type { Notification } from "~/domain/notification";
import { pushSubscriptions } from "~/infra/db/push/model";
import { createUserRepository } from "~/infra/db/user/repo";
import { createWebPush, PUSH_QUEUE, type PushDelivery } from "~/infra/push/webPush";
import { createBoss, ensureQueue } from "~/infra/queue";
import { testDatabaseUrl } from "../globalSetup";
import { connect, seedUsers, truncateAll } from "./helpers";

const sendNotification = vi.hoisted(() => vi.fn<(...args: Array<unknown>) => Promise<unknown>>());
vi.mock("web-push", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();

  return {
    ...actual,
    default: { sendNotification },
  };
});

const { client, db } = connect();
const users = createUserRepository(db);
const logger = { error: vi.fn() };
const boss = createBoss(testDatabaseUrl(), logger);
const push = createWebPush(
  db,
  {
    publicKey: "public",
    privateKey: "private",
    subject: "mailto:test@example.test",
  },
  boss,
  logger,
);

const queued = async () =>
  (await (await boss()).fetch<PushDelivery>(PUSH_QUEUE, { batchSize: 50 })).map((job) => job.data);

afterAll(async () => {
  await (await boss()).stop({ graceful: false });
  await client.end();
});
beforeEach(async () => {
  const running = await boss();
  await ensureQueue(running, PUSH_QUEUE);
  await running.deleteAllJobs(PUSH_QUEUE);
  await db.delete(pushSubscriptions);
  await truncateAll(db);
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201 });
});

const keys = {
  p256dh: "p256dh-key",
  auth: "auth-key",
};
const notificationFor = (recipientUserId: string): Notification => ({
  id: "00000000-0000-4000-8000-000000000001",
  recipientUserId,
  type: "proof_approved",
  title: "Proof approved",
  message: "You earned 10 points.",
  proofId: null,
  taskId: null,
  createdAt: new Date(),
  readAt: null,
});

async function subscriptionIdOf(endpoint: string): Promise<string> {
  const [row] = await db.select().from(pushSubscriptions);
  if (row?.endpoint !== endpoint) {
    throw new Error(`No subscription for ${endpoint}`);
  }

  return row.id;
}

describe("web push", () => {
  it("queues one delivery per browser of the recipient, and none for others", async () => {
    const { alice, bob } = await seedUsers(users);
    await push.save(alice.id, {
      endpoint: "https://push.example.test/alice",
      keys,
    });
    await push.save(bob.id, {
      endpoint: "https://push.example.test/bob",
      keys,
    });

    await push.send([notificationFor(alice.id)]);

    const deliveries = await queued();
    expect(deliveries).toHaveLength(1);
    expect(JSON.parse(deliveries[0]?.payload ?? "{}")).toMatchObject({
      title: "Proof approved",
      url: "/notifications",
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("delivers a queued push to the browser", async () => {
    const { alice } = await seedUsers(users);
    await push.save(alice.id, {
      endpoint: "https://push.example.test/alice",
      keys,
    });

    await push.deliver({
      subscriptionId: await subscriptionIdOf("https://push.example.test/alice"),
      payload: "{}",
    });

    expect(sendNotification).toHaveBeenCalledWith(
      {
        endpoint: "https://push.example.test/alice",
        keys,
      },
      "{}",
      expect.anything(),
    );
  });

  it("sends queued pushes once the worker is running", async () => {
    const { alice } = await seedUsers(users);
    await push.save(alice.id, {
      endpoint: "https://push.example.test/alice",
      keys,
    });

    await push.startWorker();
    await push.send([notificationFor(alice.id)]);

    await vi.waitFor(
      () => {
        expect(sendNotification).toHaveBeenCalledOnce();
      },
      {
        timeout: 15_000,
        interval: 250,
      },
    );
    await (await boss()).offWork(PUSH_QUEUE);
  });

  it("moves a browser to whoever subscribed it last", async () => {
    const { alice, bob } = await seedUsers(users);
    await push.save(alice.id, {
      endpoint: "https://push.example.test/shared",
      keys,
    });
    await push.save(bob.id, {
      endpoint: "https://push.example.test/shared",
      keys,
    });

    await push.send([notificationFor(alice.id)]);
    expect(await queued()).toEqual([]);

    await push.send([notificationFor(bob.id)]);
    expect(await queued()).toHaveLength(1);
  });

  it("forgets a subscription the push service says is gone", async () => {
    const { alice } = await seedUsers(users);
    await push.save(alice.id, {
      endpoint: "https://push.example.test/gone",
      keys,
    });
    sendNotification.mockRejectedValue(
      new WebPushError("Gone", 410, {}, "", "https://push.example.test/gone"),
    );

    await push.deliver({
      subscriptionId: await subscriptionIdOf("https://push.example.test/gone"),
      payload: "{}",
    });

    expect(await db.select().from(pushSubscriptions)).toEqual([]);
  });

  it("lets other delivery failures throw, so the queue retries them", async () => {
    const { alice } = await seedUsers(users);
    await push.save(alice.id, {
      endpoint: "https://push.example.test/alice",
      keys,
    });
    sendNotification.mockRejectedValue(new Error("network down"));

    await expect(
      push.deliver({
        subscriptionId: await subscriptionIdOf("https://push.example.test/alice"),
        payload: "{}",
      }),
    ).rejects.toThrow("network down");
    expect(await db.select().from(pushSubscriptions)).toHaveLength(1);
  });

  it("only lets a user remove their own subscription", async () => {
    const { alice, bob } = await seedUsers(users);
    await push.save(alice.id, {
      endpoint: "https://push.example.test/alice",
      keys,
    });

    await push.remove(bob.id, "https://push.example.test/alice");
    expect(await db.select().from(pushSubscriptions)).toHaveLength(1);

    await push.remove(alice.id, "https://push.example.test/alice");
    expect(await db.select().from(pushSubscriptions)).toEqual([]);
  });
});
