self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }
  const { id, title, message, url } = event.data.json();

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windows) => {
        if (windows.some((client) => client.focused)) {
          return undefined;
        }

        return self.registration.showNotification(title, {
          body: message,
          tag: id,
          icon: "/favicon.ico",
          data: { url },
        });
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/notifications", self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windows) => {
        const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
        if (!open) {
          return self.clients.openWindow(url);
        }

        return open
          .focus()
          .then((client) => client.navigate(url))
          .catch(() => self.clients.openWindow(url));
      }),
  );
});
