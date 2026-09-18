import { and, eq, inArray } from "drizzle-orm";
import webpush, { WebPushError } from "web-push";
import type { NotificationPort } from "~/core/ports/notification";
import type { PushPort } from "~/core/ports/push";
import type { ServerLogger } from "~/lib/logging/server";
import type { Database } from "../db/client";
import { pushSubscriptions } from "../db/push/model";
import { type Boss, ensureQueue } from "../queue";

export interface VapidSettings {
  readonly publicKey: string;
  readonly privateKey: string;
  readonly subject: string;
}

export interface PushDelivery {
  readonly subscriptionId: string;
  readonly payload: string;
}

export interface WebPush extends PushPort {
  deliver(delivery: PushDelivery): Promise<void>;
  startWorker(): Promise<void>;
}

export const PUSH_QUEUE = "push-delivery";
const PARALLEL_DELIVERIES = 5;
const GONE = new Set([404, 410]);

export function createWebPush(
  db: Database,
  vapid: VapidSettings,
  boss: Boss,
  logger: Pick<ServerLogger, "error">,
): WebPush {
  const options = {
    vapidDetails: vapid,
    TTL: 60 * 60 * 24,
  };

  async function deliver({ subscriptionId, payload }: PushDelivery) {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.id, subscriptionId));
    if (subscription === undefined) {
      return;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
        options,
      );
    } catch (error) {
      if (error instanceof WebPushError && GONE.has(error.statusCode)) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));

        return;
      }
      throw error;
    }
  }

  return {
    deliver,

    async startWorker() {
      const running = await boss();
      await ensureQueue(running, PUSH_QUEUE);
      await running.work<PushDelivery>(
        PUSH_QUEUE,
        { localConcurrency: PARALLEL_DELIVERIES },
        async (jobs) => {
          for (const job of jobs) {
            await deliver(job.data);
          }
        },
      );
    },

    async save(userId, { endpoint, keys }) {
      await db
        .insert(pushSubscriptions)
        .values({
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            userId,
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        });
    },

    async remove(userId, endpoint) {
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    },

    async send(notifications) {
      try {
        const recipients = [
          ...new Set(notifications.map((notification) => notification.recipientUserId)),
        ];
        if (recipients.length === 0) {
          return;
        }
        const subscriptions = await db
          .select({
            id: pushSubscriptions.id,
            userId: pushSubscriptions.userId,
          })
          .from(pushSubscriptions)
          .where(inArray(pushSubscriptions.userId, recipients));

        const deliveries = notifications.flatMap((notification) =>
          subscriptions
            .filter((subscription) => subscription.userId === notification.recipientUserId)
            .map((subscription) => ({
              data: {
                subscriptionId: subscription.id,
                payload: JSON.stringify({
                  id: notification.id,
                  title: notification.title,
                  message: notification.message,
                  url: "/notifications",
                }),
              },
            })),
        );
        if (deliveries.length === 0) {
          return;
        }
        const running = await boss();
        await ensureQueue(running, PUSH_QUEUE);
        await running.insert(PUSH_QUEUE, deliveries);
      } catch (error) {
        logger.error("push.enqueue_failed", error);
      }
    },
  };
}

export const disabledPush: PushPort = {
  save: () => Promise.reject(new Error("Web Push is not configured.")),
  remove: () => Promise.resolve(),
  send: () => Promise.resolve(),
};

export function withPush(notifications: NotificationPort, push: PushPort): NotificationPort {
  return {
    ...notifications,
    async publish(input) {
      const created = await notifications.publish(input);
      await push.send([created]);

      return created;
    },
    async publishMany(inputs) {
      const created = await notifications.publishMany(inputs);
      await push.send(created);

      return created;
    },
  };
}
