export const logLevels = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof logLevels)[number];
export type LogContext = Readonly<Record<string, unknown>>;

const sensitiveKey =
  /(authorization|cookie|password|passwd|secret|token|api[-_]?key|session|credential|set-cookie)/i;

export function sanitizeLogData(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }
  if (typeof value === "bigint") {
    return `${value}n`;
  }
  if (typeof value === "function" || typeof value === "symbol") {
    return `[${typeof value}]`;
  }
  if (value instanceof Error) {
    return serializeError(value, depth);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeLogData(item, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = sensitiveKey.test(key) ? "[redacted]" : sanitizeLogData(item, depth + 1);
    }

    return output;
  }

  return "undefined";
}

export function serializeError(error: unknown, depth = 0): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
      ...("digest" in error && typeof error.digest === "string" ? { digest: error.digest } : {}),
      ...("code" in error && error.code !== undefined
        ? { code: sanitizeLogData(error.code, depth + 1) }
        : {}),
      ...("reason" in error && error.reason !== undefined
        ? { reason: sanitizeLogData(error.reason, depth + 1) }
        : {}),
      ...("detail" in error && error.detail !== undefined
        ? { detail: sanitizeLogData(error.detail, depth + 1) }
        : {}),
      ...(error.cause === undefined ? {} : { cause: sanitizeLogData(error.cause, depth + 1) }),
    };
  }
  const safeValue = sanitizeLogData(error);

  return { message: typeof safeValue === "string" ? safeValue : JSON.stringify(safeValue) };
}

export function levelWeight(level: LogLevel): number {
  return logLevels.indexOf(level);
}
