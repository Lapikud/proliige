"use client";

import { sanitizeLogData, serializeError, type LogContext } from "./types";
import { toast } from "sonner";

const reported = new Set<string>();

export function reportClientError(error: unknown, context: LogContext = {}): void {
  const serialized = serializeError(error);
  const source = typeof context.source === "string" ? context.source : "client";
  const name = typeof serialized.name === "string" ? serialized.name : "Error";
  const message =
    typeof serialized.message === "string"
      ? serialized.message
      : serialized.message === undefined
        ? "Unknown error"
        : JSON.stringify(serialized.message);
  const fingerprint = `${source}:${name}:${message}`;
  if (reported.has(fingerprint)) {
    return;
  }
  reported.add(fingerprint);

  toast.error("Something went wrong", {
    description: "Please try again. If the problem continues, contact an administrator.",
  });

  if (process.env.NODE_ENV !== "production") {
    console.error("[client.error]", serialized, context);
  }

  void fetch("/api/logs/client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      error: serialized,
      context: sanitizeLogData(context),
    }),
    keepalive: true,
  }).catch(() => undefined);
}

export function reportClientWarning(message: string, context: LogContext = {}): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[client.warn] ${message}`, context);
  }
}
