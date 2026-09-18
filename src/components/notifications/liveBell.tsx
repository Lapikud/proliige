"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FC, useEffect, useState } from "react";
import { showDesktopNotification } from "./desktop";

interface Toast {
  id: string;
  title: string;
  message: string;
}

interface Props {
  initialUnread: number;
}

const TOAST_MS = 6000;

export const LiveBell: FC<Props> = ({ initialUnread }) => {
  const [unread, setUnread] = useState(initialUnread);
  const [toasts, setToasts] = useState<Array<Toast>>([]);
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("ready", (event) => {
      const { unreadCount } = frameData(event) as { unreadCount: number };
      setUnread(unreadCount);
    });

    source.addEventListener("notification", (event) => {
      const toast = frameData(event) as Toast;
      setUnread((count) => count + 1);
      setToasts((current) => [...current, toast]);
      showDesktopNotification(toast, () => {
        router.push("/notifications");
      });
      router.refresh();
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== toast.id));
      }, TOAST_MS);
    });

    return () => {
      source.close();
    };
  }, [router]);

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications, none unread";

  return (
    <>
      <Link
        href="/notifications"
        aria-label={label}
        className="relative inline-flex size-11 items-center justify-center rounded-xl text-white/85 hover:bg-white/10 hover:text-white"
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-black text-primary-foreground">
            {Math.min(unread, 99)}
          </span>
        )}
      </Link>

      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-24 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-xl border-2 border-foreground bg-card px-4 py-3 shadow-hard"
          >
            <p className="text-sm font-bold text-foreground">{toast.title}</p>
            <p className="text-sm text-muted-foreground">{toast.message}</p>
          </div>
        ))}
      </div>
    </>
  );
};

function frameData(event: Event): unknown {
  return JSON.parse((event as MessageEvent<string>).data);
}
