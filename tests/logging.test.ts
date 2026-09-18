import { describe, expect, it } from "vitest";
import { sanitizeLogData, serializeError } from "~/lib/logging/types";

describe("logging data safety", () => {
  it("redacts credentials recursively", () => {
    expect(
      sanitizeLogData({
        password: "secret",
        nested: {
          authorization: "Bearer token",
          safe: "ok",
        },
      }),
    ).toEqual({
      password: "[redacted]",
      nested: {
        authorization: "[redacted]",
        safe: "ok",
      },
    });
  });

  it("serializes errors without losing the stack", () => {
    const error = new Error("broken");
    expect(serializeError(error)).toMatchObject({
      name: "Error",
      message: "broken",
    });
    expect(serializeError(error)).toHaveProperty("stack");
  });

  it("keeps the driver error under a wrapping error", () => {
    const driver = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
      code: "ECONNREFUSED",
    });
    const query = new Error("Failed query: select 1", { cause: driver });

    expect(serializeError(query)).toMatchObject({
      message: "Failed query: select 1",
      cause: {
        message: "connect ECONNREFUSED 127.0.0.1:5432",
        code: "ECONNREFUSED",
      },
    });
  });

  it("turns unknown object errors into useful messages", () => {
    expect(
      serializeError({
        code: "RPC_ERROR",
        message: "FreeIPA rejected the request",
      }),
    ).toEqual({
      message: '{"code":"RPC_ERROR","message":"FreeIPA rejected the request"}',
    });
  });
});
