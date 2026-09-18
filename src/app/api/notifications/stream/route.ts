import type { Notification } from "~/domain/notification";
import { notificationService } from "~/infra";
import { route } from "~/lib/http";
import { getUser } from "~/lib/user";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

export const GET = route(async (request) => {
  const user = await getUser();
  const unreadCount = await notificationService.countUnreadNotifications(user);
  const lastEventId = request.headers.get("Last-Event-ID");
  const missed = lastEventId
    ? await notificationService.listMissedNotifications(user, lastEventId)
    : [];
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;

      const write = (text: string) => {
        if (!open) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          open = false;
        }
      };
      const send = (notification: Notification) => {
        write(frame("notification", toPayload(notification), notification.id));
      };

      write("retry: 3000\n\n");
      write(frame("ready", { unreadCount }));
      missed.forEach(send);

      const unsubscribe = await notificationService.subscribeToNotifications(user, send);
      const heartbeat = setInterval(() => {
        write(": heartbeat\n\n");
      }, HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        open = false;
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

function frame(event: string, data: unknown, id?: string): string {
  const idLine = id ? `id: ${id}\n` : "";

  return `${idLine}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function toPayload(notification: Notification) {
  return {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}
