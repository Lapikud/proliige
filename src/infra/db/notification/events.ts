import type { Notification } from "~/domain/notification";

class SubscriberRegistry {
  private readonly listeners = new Map<string, Set<(n: Notification) => void>>();

  subscribe(userId: string, listener: (n: Notification) => void): () => void {
    const set = this.listeners.get(userId) ?? new Set();
    set.add(listener);
    this.listeners.set(userId, set);

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(userId);
      }
    };
  }

  emit(notification: Notification): void {
    const set = this.listeners.get(notification.recipientUserId);
    if (set === undefined) {
      return;
    }
    for (const listener of set) {
      try {
        listener(notification);
      } catch {
        continue;
      }
    }
  }
}

const globalForRegistry = globalThis as unknown as {
  registry?: SubscriberRegistry;
};

export function registry(): SubscriberRegistry {
  globalForRegistry.registry ??= new SubscriberRegistry();

  return globalForRegistry.registry;
}
