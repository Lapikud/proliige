import type { Notification } from "~/domain/notification";

export interface PushSubscriptionInput {
  readonly endpoint: string;
  readonly keys: {
    readonly p256dh: string;
    readonly auth: string;
  };
}

export interface PushPort {
  save(userId: string, subscription: PushSubscriptionInput): Promise<void>;
  remove(userId: string, endpoint: string): Promise<void>;
  send(notifications: ReadonlyArray<Notification>): Promise<void>;
}
