import type { NewNotification, Notification } from "~/domain/notification";
import type { PublicUserView } from "~/domain/user";

export interface NotificationPort {
  publish(notification: NewNotification): Promise<Notification>;

  publishMany(notifications: ReadonlyArray<NewNotification>): Promise<Array<Notification>>;

  list(userId: string, limit?: number): Promise<Array<Notification>>;
  unreadCount(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;

  since(userId: string, notificationId: string): Promise<Array<Notification>>;

  subscribe(userId: string, listener: (n: Notification) => void): () => void;
}

export interface AdminDirectoryPort {
  listAdmins(): Promise<Array<PublicUserView>>;
}
