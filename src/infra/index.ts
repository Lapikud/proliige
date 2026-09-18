import "server-only";
import { createAuthService } from "~/core/services/auth";
import { createBackupService } from "~/core/services/backup";
import { createCategoryService } from "~/core/services/category";
import { createCommentService } from "~/core/services/comment";
import { createFeedService } from "~/core/services/feed";
import { createLeaderboardService } from "~/core/services/leaderboard";
import { createLikeService } from "~/core/services/like";
import { createNotificationService } from "~/core/services/notification";
import { createPhotoService } from "~/core/services/photo";
import { createProofService } from "~/core/services/proof";
import { createTaskService } from "~/core/services/task";
import { createUserService } from "~/core/services/user";
import { accessConfig } from "~/config/access";
import { logger } from "~/lib/logging/server";
import { env, garageEnv } from "~/env.config";
import { type ClockPort, systemClock } from "~/core/ports/clock";
import type { ObjectStoragePort } from "~/core/ports/objectStorage";
import { createFreeipaAuthentication } from "./auth/freeipa";
import { createCookieSession } from "./auth/session";
import { createCategoryRepository } from "./db/category/repo";
import { getDatabase } from "./db/client";
import { createFeedRepository } from "./db/feed/repo";
import { createCommentRepository } from "./db/feed/comment";
import { createLikeRepository } from "./db/feed/like";
import { createAdminDirectory } from "./db/user/admin";
import { createUserRepository } from "./db/user/repo";
import { createNotificationAdapter } from "./db/notification/repo";
import { createLeaderboardRepository } from "./db/points/repo";
import { createProofRepository } from "./db/proof/repo";
import { createTaskRepository } from "./db/task/repo";
import { createGarageObjectStorage } from "./storage/garage";
import { createMemoryObjectStorage } from "./storage/memory";
import type { PushPort } from "~/core/ports/push";
import { createWebPush, disabledPush, type WebPush, withPush } from "./push/webPush";
import { createBoss } from "./queue";
import { createNextcloudBackup } from "./backup/nextcloud";
import { createPhotoBackupLog } from "./db/backup/repo";
import type { BackupDestination } from "~/core/ports/backup";
import { schedulePhotoBackup } from "./backup/schedule";

function objectStorageFor(config: typeof env): ObjectStoragePort {
  switch (config.STORAGE_DRIVER) {
    case "garage":
      return createGarageObjectStorage(garageEnv(config));
    case "memory":
      return createMemoryObjectStorage();
  }
}

function backupDestinationFor(config: typeof env): BackupDestination | null {
  const {
    NEXTCLOUD_WEBDAV_URL: url,
    NEXTCLOUD_USERNAME: username,
    NEXTCLOUD_PASSWORD: password,
  } = config;
  if (url === undefined || username === undefined || password === undefined) {
    return null;
  }

  return createNextcloudBackup({
    url,
    username,
    password,
    basePath: config.NEXTCLOUD_BACKUP_PATH,
  });
}

function webPushFor(config: typeof env): WebPush | null {
  const {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey,
    VAPID_PRIVATE_KEY: privateKey,
    VAPID_SUBJECT: subject,
  } = config;
  if (publicKey === undefined || privateKey === undefined || subject === undefined) {
    return null;
  }

  return createWebPush(
    db,
    {
      publicKey,
      privateKey,
      subject,
    },
    boss,
    logger,
  );
}

const db = getDatabase();
const boss = createBoss(env.DATABASE_URL, logger);
const webPush = webPushFor(env);

const userRepository = createUserRepository(db);
const categoryRepository = createCategoryRepository(db);
const taskRepository = createTaskRepository(db);
const proofRepository = createProofRepository(db);
const leaderboardRepository = createLeaderboardRepository(db);
const feedRepository = createFeedRepository(db);
const likeRepository = createLikeRepository(db);
const commentRepository = createCommentRepository(db);
const adminDirectory = createAdminDirectory(db, accessConfig.adminGroups);

const push: PushPort = webPush ?? disabledPush;
const notificationPort = withPush(createNotificationAdapter(db), push);
const objectStorage = objectStorageFor(env);
const session = createCookieSession(userRepository);
const authentication = createFreeipaAuthentication();
const clock: ClockPort = systemClock;
const photoBackupLog = createPhotoBackupLog(db);
const backupDestination = backupDestinationFor(env);

export const authService = createAuthService({
  authentication,
  session,
  users: userRepository,
});

export const taskService = createTaskService({ tasks: taskRepository });

export const categoryService = createCategoryService({ categories: categoryRepository });

export const photoService = createPhotoService({
  storage: objectStorage,
  proofs: proofRepository,
});

export const proofService = createProofService({
  proofs: proofRepository,
  tasks: taskRepository,
  photos: photoService,
  notifications: notificationPort,
  admins: adminDirectory,
  clock,
});

export const feedService = createFeedService({ feed: feedRepository });

export const leaderboardService = createLeaderboardService({ leaderboard: leaderboardRepository });

export const commentService = createCommentService({
  comments: commentRepository,
  proofs: proofRepository,
  notifications: notificationPort,
  clock,
});

export const likeService = createLikeService({
  likes: likeRepository,
  proofs: proofRepository,
  clock,
});

export const notificationService = createNotificationService({
  notifications: notificationPort,
  push,
});

export const userService = createUserService({ users: userRepository });

export const backupService =
  backupDestination &&
  createBackupService({
    log: photoBackupLog,
    storage: objectStorage,
    destination: backupDestination,
    clock,
  });

export async function startWorkers(): Promise<void> {
  await webPush?.startWorker();
  if (backupService) {
    await schedulePhotoBackup(boss, () => backupService.backUpPhotos());
  }
}
