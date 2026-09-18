"use client";

import { BellOff, BellRing } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "~/actions/notification";
import { Button } from "../ui/button";
import { Notice } from "../ui/feedback";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

interface Props {
  vapidPublicKey: string | null;
}

export const DesktopNotifications: FC<Props> = ({ vapidPublicKey }) => {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void currentState(vapidPublicKey).then(setState);
  }, [vapidPublicKey]);

  const act = (change: () => Promise<State>) => {
    setBusy(true);
    setError(null);
    change()
      .then(setState)
      .catch(() => {
        setError("That did not work. Try again, or check your browser's notification settings.");
      })
      .finally(() => {
        setBusy(false);
      });
  };

  if (state === "loading" || state === "unsupported") {
    return null;
  }
  if (state === "denied") {
    return (
      <Notice>
        Desktop notifications are blocked for this site. Allow them in your browser&apos;s site
        settings to get them.
      </Notice>
    );
  }

  return (
    <Notice className="flex flex-wrap items-center justify-between gap-3">
      <span>
        {state === "on"
          ? "Desktop notifications are on for this browser."
          : vapidPublicKey
            ? "Get a desktop notification when something needs you, even with the site closed."
            : "Get a desktop notification when something needs you while this site is open."}
        {error && <span className="block text-destructive">{error}</span>}
      </span>
      {state === "on" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            act(turnOff);
          }}
        >
          <BellOff aria-hidden="true" className="size-4" />
          Turn off
        </Button>
      ) : (
        <Button
          size="sm"
          variant="brand"
          disabled={busy}
          onClick={() => {
            act(() => turnOn(vapidPublicKey));
          }}
        >
          <BellRing aria-hidden="true" className="size-4" />
          Turn on
        </Button>
      )}
    </Notice>
  );
};

function supportsPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

async function currentState(vapidPublicKey: string | null): Promise<State> {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  if (Notification.permission !== "granted") {
    return "off";
  }
  if (vapidPublicKey === null || !supportsPush()) {
    return "on";
  }
  const subscription = await (await registerWorker()).pushManager.getSubscription();
  if (subscription === null) {
    return "off";
  }
  await save(subscription);

  return "on";
}

async function turnOn(vapidPublicKey: string | null): Promise<State> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "off";
  }
  if (vapidPublicKey === null || !supportsPush()) {
    return "on";
  }
  const registration = await registerWorker();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(vapidPublicKey),
    }));
  await save(subscription);

  return "on";
}

async function turnOff(): Promise<State> {
  await forgetThisBrowser();

  return "off";
}

export async function forgetThisBrowser(): Promise<void> {
  if (!supportsPush()) {
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration("/serviceWorker.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    return;
  }
  await removePushSubscriptionAction({ endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}

function registerWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/serviceWorker.js");
}

async function save(subscription: PushSubscription): Promise<void> {
  const { endpoint, keys } = subscription.toJSON();
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (endpoint === undefined || p256dh === undefined || auth === undefined) {
    throw new Error("The browser returned an incomplete push subscription.");
  }
  const result = await savePushSubscriptionAction({
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replaceAll("-", "+")
    .replaceAll("_", "/");

  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export function showDesktopNotification(
  notification: {
    id: string;
    title: string;
    message: string;
  },
  onOpen: () => void,
): void {
  if (!("Notification" in window) || Notification.permission !== "granted" || !document.hidden) {
    return;
  }
  const shown = new Notification(notification.title, {
    body: notification.message,
    tag: notification.id,
  });
  shown.onclick = () => {
    window.focus();
    onOpen();
    shown.close();
  };
}
