import { afterEach, describe, expect, it, vi } from "vitest";

const load = () => import("~/env.config");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("environment validation", () => {
  it("loads in the browser, where only public variables exist", async () => {
    vi.stubGlobal("window", {});
    vi.stubEnv("STORAGE_DRIVER", undefined);
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", undefined);
    vi.stubEnv("VAPID_SUBJECT", undefined);

    const { env } = await load();

    expect(env.NEXT_PUBLIC_PHOTO_MAX_PER_PROOF).toBeGreaterThan(0);
    expect(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY).toBe("public-key");
  });

  it("still refuses half-configured Web Push on the server", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", undefined);
    vi.stubEnv("VAPID_SUBJECT", undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(load()).rejects.toThrow("Invalid environment variables");
  });

  it("requires Garage credentials on the server when Garage stores photos", async () => {
    vi.stubEnv("STORAGE_DRIVER", "garage");
    vi.stubEnv("GARAGE_ENDPOINT", undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(load()).rejects.toThrow("Invalid environment variables");
  });
});
