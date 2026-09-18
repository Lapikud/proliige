import { defineEnv } from "envin";
import { z } from "zod";

const blankIsUnset = (value: unknown) => (value === "" ? undefined : value);

const text = (fallback?: string) =>
  z.preprocess(
    blankIsUnset,
    fallback === undefined ? z.string().min(1) : z.string().min(1).default(fallback),
  );
const optionalText = () => z.preprocess(blankIsUnset, z.string().min(1).optional());
const url = () => z.preprocess(blankIsUnset, z.url());
const optionalUrl = () => z.preprocess(blankIsUnset, z.url().optional());
const integer = (fallback: number) =>
  z.preprocess(blankIsUnset, z.coerce.number().int().positive().default(fallback));

const garageRequired = ["GARAGE_ENDPOINT", "GARAGE_ACCESS_KEY", "GARAGE_SECRET_KEY"] as const;
const nextcloudSettings = [
  "NEXTCLOUD_WEBDAV_URL",
  "NEXTCLOUD_USERNAME",
  "NEXTCLOUD_PASSWORD",
] as const;
const pushSettings = [
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;

export const env = defineEnv({
  clientPrefix: "NEXT_PUBLIC_",

  client: {
    NEXT_PUBLIC_PHOTO_MAX_FILE_SIZE_BYTES: integer(5 * 1024 * 1024),
    NEXT_PUBLIC_PHOTO_MAX_PER_PROOF: integer(5),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: optionalText(),
  },

  server: {
    SITE_URL: z.preprocess(blankIsUnset, z.url().default("http://localhost:3000")),
    DATABASE_URL: url(),

    SESSION_SECRET: z.preprocess(blankIsUnset, z.string().min(32, "Use at least 32 characters.")),
    SESSION_COOKIE_NAME: text("lapikud_session"),
    SESSION_TTL_SECONDS: integer(43_200),

    FREEIPA_SERVER: text(),
    FREEIPA_CLIENT_VERSION: optionalText(),
    FREEIPA_TIMEOUT_MS: integer(10_000),

    STORAGE_DRIVER: z.enum(["garage", "memory"]).default("garage"),
    GARAGE_ENDPOINT: optionalUrl(),
    GARAGE_ACCESS_KEY: optionalText(),
    GARAGE_SECRET_KEY: optionalText(),
    GARAGE_PHOTO_BUCKET: text("lapikud-photos"),
    GARAGE_REGION: text("garage"),
    GARAGE_PUBLIC_ENDPOINT: optionalUrl(),

    PHOTO_UPLOAD_URL_TTL_SECONDS: integer(300),

    NEXTCLOUD_WEBDAV_URL: optionalUrl(),
    NEXTCLOUD_USERNAME: optionalText(),
    NEXTCLOUD_PASSWORD: optionalText(),
    NEXTCLOUD_BACKUP_PATH: text("/lapikud-photo-backups"),

    VAPID_PRIVATE_KEY: optionalText(),
    VAPID_SUBJECT: optionalText(),

    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    LOG_FILE: optionalText(),
  },

  envStrict: {
    NEXT_PUBLIC_PHOTO_MAX_FILE_SIZE_BYTES: process.env.NEXT_PUBLIC_PHOTO_MAX_FILE_SIZE_BYTES,
    NEXT_PUBLIC_PHOTO_MAX_PER_PROOF: process.env.NEXT_PUBLIC_PHOTO_MAX_PER_PROOF,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    SITE_URL: process.env.SITE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS: process.env.SESSION_TTL_SECONDS,
    FREEIPA_SERVER: process.env.FREEIPA_SERVER,
    FREEIPA_CLIENT_VERSION: process.env.FREEIPA_CLIENT_VERSION,
    FREEIPA_TIMEOUT_MS: process.env.FREEIPA_TIMEOUT_MS,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    GARAGE_ENDPOINT: process.env.GARAGE_ENDPOINT,
    GARAGE_ACCESS_KEY: process.env.GARAGE_ACCESS_KEY,
    GARAGE_SECRET_KEY: process.env.GARAGE_SECRET_KEY,
    GARAGE_PHOTO_BUCKET: process.env.GARAGE_PHOTO_BUCKET,
    GARAGE_REGION: process.env.GARAGE_REGION,
    GARAGE_PUBLIC_ENDPOINT: process.env.GARAGE_PUBLIC_ENDPOINT,
    PHOTO_UPLOAD_URL_TTL_SECONDS: process.env.PHOTO_UPLOAD_URL_TTL_SECONDS,
    NEXTCLOUD_WEBDAV_URL: process.env.NEXTCLOUD_WEBDAV_URL,
    NEXTCLOUD_USERNAME: process.env.NEXTCLOUD_USERNAME,
    NEXTCLOUD_PASSWORD: process.env.NEXTCLOUD_PASSWORD,
    NEXTCLOUD_BACKUP_PATH: process.env.NEXTCLOUD_BACKUP_PATH,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_FILE: process.env.LOG_FILE,
  },

  transform: (shape, isServer) =>
    z.object(shape).transform((values, context) => {
      // Server variables never reach the browser, so these rules would always fail there.
      if (!isServer) {
        return values;
      }

      const report = (names: ReadonlyArray<keyof typeof values>, message: string) => {
        for (const name of names) {
          if (values[name] === undefined) {
            context.issues.push({
              code: "custom",
              input: undefined,
              path: [name],
              message,
            });
          }
        }
      };

      if (nextcloudSettings.some((name) => values[name] !== undefined)) {
        report(nextcloudSettings, "Set all Nextcloud settings or none.");
      }
      if (pushSettings.some((name) => values[name] !== undefined)) {
        report(pushSettings, "Set all Web Push settings or none.");
      }

      if (values.STORAGE_DRIVER === "memory") {
        return values;
      }

      const { GARAGE_ENDPOINT, GARAGE_ACCESS_KEY, GARAGE_SECRET_KEY } = values;
      if (
        GARAGE_ENDPOINT === undefined ||
        GARAGE_ACCESS_KEY === undefined ||
        GARAGE_SECRET_KEY === undefined
      ) {
        report(garageRequired, "Required when STORAGE_DRIVER is garage.");

        return z.NEVER;
      }

      return {
        ...values,
        STORAGE_DRIVER: "garage" as const,
        GARAGE_ENDPOINT,
        GARAGE_ACCESS_KEY,
        GARAGE_SECRET_KEY,
      };
    }),
});

export type GarageEnv = typeof env & {
  GARAGE_ENDPOINT: string;
  GARAGE_ACCESS_KEY: string;
  GARAGE_SECRET_KEY: string;
};

export function garageEnv(config: typeof env): GarageEnv {
  const { GARAGE_ENDPOINT, GARAGE_ACCESS_KEY, GARAGE_SECRET_KEY } = config;
  if (
    GARAGE_ENDPOINT === undefined ||
    GARAGE_ACCESS_KEY === undefined ||
    GARAGE_SECRET_KEY === undefined
  ) {
    throw new Error("Garage is the storage strategy but its endpoint or credentials are missing.");
  }

  return {
    ...config,
    GARAGE_ENDPOINT,
    GARAGE_ACCESS_KEY,
    GARAGE_SECRET_KEY,
  };
}
