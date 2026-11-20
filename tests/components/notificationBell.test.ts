import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LiveBell } from "~/components/notifications/liveBell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("~/components/notifications/desktop", () => ({
  showDesktopNotification: vi.fn(),
}));

describe("notification bell", () => {
  it.each([0, 2, 120])("renders the server unread count of %i", (unread) => {
    const html = renderToStaticMarkup(createElement(LiveBell, { unread }));

    expect(html).toContain(
      `aria-label="${unread > 0 ? `Notifications, ${unread} unread` : "Notifications, none unread"}"`,
    );
    if (unread > 0) {
      expect(html).toContain(`>${Math.min(unread, 99)}</span>`);
    } else {
      expect(html).not.toContain("<span");
    }
  });
});
