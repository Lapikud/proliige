import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { env } from "~/env.config";
import {
  levelWeight,
  logLevels,
  sanitizeLogData,
  serializeError,
  type LogContext,
  type LogLevel,
} from "./types";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  environment: string;
  context?: unknown;
  error?: unknown;
}

let fileFailureReported = false;

function configuredLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL;

  return configured && logLevels.includes(configured as LogLevel)
    ? (configured as LogLevel)
    : env.LOG_LEVEL;
}

function logFile(): string | undefined {
  if (env.LOG_FILE) {
    return resolve(process.cwd(), env.LOG_FILE);
  }

  return process.env.NODE_ENV === "production" ? undefined : resolve(process.cwd(), "logs/app.log");
}

function writeEntry(entry: LogEntry): void {
  const line = `${JSON.stringify(entry)}\n`;
  if (entry.level === "error") {
    console.error(line.trimEnd());
  } else if (entry.level === "warn") {
    console.warn(line.trimEnd());
  } else {
    process.stdout.write(line);
  }

  const file = logFile();
  if (!file) {
    return;
  }
  void mkdir(dirname(file), { recursive: true })
    .then(() => appendFile(file, line, "utf8"))
    .catch((error: unknown) => {
      if (!fileFailureReported) {
        fileFailureReported = true;
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "error",
            message: "logging.file_write_failed",
            error: serializeError(error),
          }),
        );
      }
    });
}

function write(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
  if (levelWeight(level) < levelWeight(configuredLevel())) {
    return;
  }
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV,
    ...(context === undefined ? {} : { context: sanitizeLogData(context) }),
    ...(error === undefined ? {} : { error: sanitizeLogData(serializeError(error)) }),
  };
  writeEntry(entry);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    write("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, error?: unknown, context?: LogContext) {
    write("error", message, context, error);
  },
};

export type ServerLogger = typeof logger;
