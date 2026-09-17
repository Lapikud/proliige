import type { Notification } from "~/domain/notification";
import { userCanReadNotifications } from "~/domain/rules";
import { guard } from "../guard";
import type { NotificationPort } from "../ports/notification";
import type { PushPort, PushSubscriptionInput } from "../ports/push";

interface Deps {
  readonly notifications: NotificationPort;
  readonly push: PushPort;
}

export function createNotificationService({ notifications, push }: Deps) {
  return {
    listNotifications: guard(userCanReadNotifications, (user, limit?: number) =>
      notifications.list(user.id, limit ?? 50),
    ),

    countUnreadNotifications: guard(userCanReadNotifications, (user) =>
      notifications.unreadCount(user.id),
    ),

    markNotificationRead: guard(userCanReadNotifications, (user, notificationId: string) =>
      notifications.markRead(user.id, notificationId),
    ),

    markAllNotificationsRead: guard(userCanReadNotifications, (user) =>
      notifications.markAllRead(user.id),
    ),

    listMissedNotifications: guard(userCanReadNotifications, (user, notificationId: string) =>
      notifications.since(user.id, notificationId),
    ),

    subscribeToNotifications: guard(
      userCanReadNotifications,
      (user, listener: (notification: Notification) => void) =>
        notifications.subscribe(user.id, listener),
    ),

    savePushSubscription: guard(
      userCanReadNotifications,
      (user, subscription: PushSubscriptionInput) => push.save(user.id, subscription),
    ),

    removePushSubscription: guard(userCanReadNotifications, (user, endpoint: string) =>
      push.remove(user.id, endpoint),
    ),
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
