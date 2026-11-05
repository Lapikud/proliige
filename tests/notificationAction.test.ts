import { beforeEach, describe, expect, it, vi } from "vitest";
import { refresh } from "next/cache";
import { markAllReadAction } from "~/actions/notification";
import { notificationService } from "~/infra";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("~/lib/user", () => ({ getUser: vi.fn().mockResolvedValue({ id: "member-1" }) }));
vi.mock("~/lib/logging/server", () => ({ logger: { error: vi.fn() } }));
vi.mock("~/infra", () => ({
  notificationService: { markAllNotificationsRead: vi.fn() },
}));

describe("mark all notifications read action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.markAllNotificationsRead).mockReset();
  });

  it("refreshes the page and navigation only after the database update succeeds", async () => {
    vi.mocked(notificationService.markAllNotificationsRead).mockImplementation(() => {
      expect(refresh).not.toHaveBeenCalled();

      return Promise.resolve();
    });

    expect(await markAllReadAction({})).toEqual({
      ok: true,
      data: undefined,
    });
    expect(notificationService.markAllNotificationsRead).toHaveBeenCalledWith({ id: "member-1" });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh when marking notifications fails", async () => {
    const error = new Error("Database unavailable");
    vi.mocked(notificationService.markAllNotificationsRead).mockRejectedValue(error);

    await expect(markAllReadAction({})).rejects.toThrow(error);
    expect(refresh).not.toHaveBeenCalled();
  });
});
