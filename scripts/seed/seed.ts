import { and, count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accessConfig } from "~/config/access";
import { photoLimits } from "~/config/photo";
import type { ClockPort } from "~/core/ports/clock";
import type { NotificationPort } from "~/core/ports/notification";
import type { ObjectStoragePort } from "~/core/ports/objectStorage";
import { createPhotoService } from "~/core/services/photo";
import { createProofService } from "~/core/services/proof";
import { createRecognitionService } from "~/core/services/recognition";
import { createTaskService } from "~/core/services/task";
import type { PostRef } from "~/domain/feed";
import type { Notification } from "~/domain/notification";
import type { Proof } from "~/domain/proof";
import type { Task } from "~/domain/task";
import type { User } from "~/domain/user";
import { env, garageEnv } from "~/env.config";
import { photoBackups } from "~/infra/db/backup/model";
import { categories } from "~/infra/db/category/model";
import { createCategoryRepository } from "~/infra/db/category/repo";
import { createCommentRepository } from "~/infra/db/feed/comment";
import { createLikeRepository } from "~/infra/db/feed/like";
import { proofComments, proofLikes } from "~/infra/db/feed/model";
import { notifications } from "~/infra/db/notification/model";
import { pointsLedger } from "~/infra/db/points/model";
import { createLeaderboardRepository } from "~/infra/db/points/repo";
import { proofPhotos, proofs } from "~/infra/db/proof/model";
import { createProofRepository } from "~/infra/db/proof/repo";
import { recognitionBadges } from "~/infra/db/recognition/badgeModel";
import { recognitions } from "~/infra/db/recognition/model";
import { createRecognitionRepository } from "~/infra/db/recognition/repo";
import * as schema from "~/infra/db/schema";
import { tasks } from "~/infra/db/task/model";
import { createTaskRepository } from "~/infra/db/task/repo";
import { createAdminDirectory } from "~/infra/db/user/admin";
import { users } from "~/infra/db/user/model";
import { createUserRepository } from "~/infra/db/user/repo";
import { createGarageObjectStorage } from "~/infra/storage/garage";
import { createMemoryObjectStorage } from "~/infra/storage/memory";
import { gradientPng } from "./png";

const DAY = 86_400_000;
const target = new URL(env.DATABASE_URL);
const localHosts = ["localhost", "127.0.0.1", "[::1]", "::1"];

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed: NODE_ENV is production.");
}
if (!localHosts.includes(target.hostname) && process.env.SEED_CONFIRM !== "1") {
  throw new Error(
    `Refusing to seed ${target.hostname}: it is not localhost. Set SEED_CONFIRM=1 if this really is a dev database.`,
  );
}

const photosEnabled = env.STORAGE_DRIVER === "garage";
const say = (...parts: ReadonlyArray<unknown>) =>
  process.stdout.write(
    `${parts.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join(" ")}\n`,
  );
say(`Seeding ${target.hostname}:${target.port || 5432}${target.pathname}`);
say(
  "This deletes every user, category, task, proof, photo row, recognition, badge, like, comment, notification and points entry, then adds example data.",
);
say(
  photosEnabled
    ? `Photos go to the Garage bucket "${env.GARAGE_PHOTO_BUCKET}".`
    : "Warning: STORAGE_DRIVER is memory, so photo cases are skipped.",
);

const client = postgres(env.DATABASE_URL, {
  max: 4,
  onnotice: () => undefined,
});
const db = drizzle(client, { schema });

let current = new Date();
const startedAt = Date.now();
const clock: ClockPort = { now: () => current };
function time(daysAgo: number, minutes = 0) {
  return new Date(startedAt - daysAgo * DAY + minutes * 60_000);
}
function at(daysAgo: number, minutes = 0) {
  current = time(daysAgo, minutes);
}

const noNotifications: NotificationPort = {
  publish: () => Promise.resolve({} as Notification),
  publishMany: () => Promise.resolve([]),
  list: () => Promise.resolve([]),
  unreadCount: () => Promise.resolve(0),
  markRead: () => Promise.resolve(),
  markAllRead: () => Promise.resolve(),
  since: () => Promise.resolve([]),
  subscribe: () => () => undefined,
};

const storage: ObjectStoragePort = photosEnabled
  ? createGarageObjectStorage(garageEnv(env))
  : createMemoryObjectStorage();
const userRepository = createUserRepository(db);
const categoryRepository = createCategoryRepository(db);
const taskRepository = createTaskRepository(db);
const proofRepository = createProofRepository(db);
const recognitionRepository = createRecognitionRepository(db, accessConfig.pixelGroups);
const commentRepository = createCommentRepository(db);
const likeRepository = createLikeRepository(db);
const leaderboardRepository = createLeaderboardRepository(db);
const photoService = createPhotoService({
  storage,
  proofs: proofRepository,
});
const taskService = createTaskService({
  tasks: taskRepository,
  clock,
});
const recognitionService = createRecognitionService({
  recognitions: recognitionRepository,
  clock,
});
const proofService = createProofService({
  proofs: proofRepository,
  tasks: taskRepository,
  photos: photoService,
  notifications: noNotifications,
  admins: createAdminDirectory(db, accessConfig.adminGroups),
  clock,
});

const photo = {
  square: gradientPng(800, 800, [244, 162, 97], [231, 111, 81]),
  portrait: gradientPng(600, 1200, [42, 157, 143], [38, 70, 83]),
  landscape: gradientPng(1600, 900, [233, 196, 106], [42, 157, 143]),
  tall: gradientPng(400, 1400, [131, 56, 236], [58, 134, 255]),
  wide: gradientPng(1800, 600, [255, 0, 110], [251, 86, 7]),
  small: gradientPng(320, 240, [6, 214, 160], [17, 138, 178]),
};
const mixed = [photo.landscape, photo.portrait, photo.square, photo.wide, photo.tall, photo.small];
const maxPhotos = Array.from(
  { length: photoLimits.maxPhotosPerProof },
  (_, i) => mixed[i % mixed.length] ?? photo.square,
);

const shortText = "Done, all clean.";
const longText = [
  "Started right after the meeting and it took most of the evening. The first part was clearing everything off so there was room to work, which turned out to be half the job because a lot had piled up over the summer.",
  "After that I sorted what was left into things that belong somewhere else, things that are broken, and things nobody will miss. The broken things are in a box by the door with a note on it, so whoever is next can decide what to do with them.",
  "The last hour went into wiping everything down and putting the useful bits back where people will actually look for them. I also made a short list of what we are running low on and left it on the whiteboard.",
  "If anyone has opinions about where the spare cables should live, tell me before Friday and I will move them. Otherwise they stay in the second drawer from the top, labelled.",
].join("\n\n");
const markdownText = `## What I did

Replaced the **heating element** and re-flashed the firmware. It prints *much* more evenly now.

- Cleaned the nozzle
- Levelled the bed with a sheet of paper
- Updated the [setup notes](https://example.org/printer-notes)

Run \`make flash\` from the printer folder if it ever needs a reset:

\`\`\`sh
#!/usr/bin/env bash
set -euo pipefail

PORT="\${PORT:-/dev/ttyUSB0}"
BAUD=115200
FIRMWARE="build/firmware.hex"

echo "Checking the board on $PORT"
if [ ! -e "$PORT" ]; then
  echo "No board found on $PORT" >&2
  exit 1
fi

make clean
make -j"$(nproc)" firmware
avrdude -p m2560 -c wiring -P "$PORT" -b "$BAUD" -D -U flash:w:"$FIRMWARE":i
echo "Flashed $FIRMWARE, now run a test print at 0.2 mm layer height"
\`\`\`

### Still to do

1. Order a spare nozzle
2. Print a calibration cube`;
const longComment =
  "This looks great, thanks for doing it. I tried the same thing last spring and gave up halfway, so I know how long it takes. One small thing for next time: the second shelf is where people look first, so it might be worth putting the things we use most there. Also, if you have the list of what is missing, could you post it in the chat? I am going to the shop on Thursday and can pick most of it up. Either way, really nice work, the room feels twice as big now.";

type Account = Awaited<ReturnType<typeof userRepository.upsertFromIdentity>>;

function signUp(uid: string, displayName: string, groups: ReadonlyArray<string>) {
  return userRepository.upsertFromIdentity({
    ipaUniqueId: `seed-${uid}`,
    uid,
    displayName,
    groups,
  });
}

async function uploadAll(user: User, photos: ReadonlyArray<Uint8Array>) {
  const proofRef = crypto.randomUUID();
  const uploads = await Promise.all(
    photos.map((bytes) =>
      photoService.uploadPhoto(user, {
        proofRef,
        bytes,
      }),
    ),
  );

  return uploads.map((upload) => upload.objectKey);
}

let skippedPhotoCases = 0;

async function submit(
  user: User,
  task: Task,
  daysAgo: number,
  input: {
    text?: string;
    markdown?: boolean;
    photos?: ReadonlyArray<Uint8Array>;
    reviewers?: ReadonlyArray<User>;
  } = {},
): Promise<Proof | null> {
  const photos = photosEnabled ? (input.photos ?? []) : [];
  if (task.photoRequired && photos.length === 0) {
    skippedPhotoCases++;

    return null;
  }
  at(daysAgo);

  return proofService.submitProof(user, {
    taskId: task.id,
    textAnswer: input.text ?? "",
    textMarkdown: input.markdown ?? false,
    objectKeys: await uploadAll(user, photos),
    reviewerIds: (input.reviewers ?? []).map((reviewer) => reviewer.id),
  });
}

async function approve(proof: Proof | null, reviewer: User, daysAgo: number, points?: number) {
  if (proof === null) return null;
  at(daysAgo, 30);
  await proofService.approveProof(
    reviewer,
    proof.id,
    points === undefined ? undefined : { points },
  );

  return proof;
}

async function reject(proof: Proof | null, reviewer: User, daysAgo: number, reason: string | null) {
  if (proof === null) return;
  at(daysAgo, 30);
  await proofService.rejectProof(reviewer, {
    proofId: proof.id,
    reason,
  });
}

function proofPost(proof: Proof | null): PostRef | null {
  return (
    proof && {
      kind: "proof",
      id: proof.id,
    }
  );
}

async function like(post: PostRef | null, likers: ReadonlyArray<User>, daysAgo: number) {
  if (post === null) return;
  await Promise.all(
    likers.map((liker, i) =>
      likeRepository.toggleLike({
        post,
        userId: liker.id,
        now: time(daysAgo, 40 + i),
      }),
    ),
  );
}

function comment(post: PostRef | null, author: User, body: string, daysAgo: number) {
  if (post === null) return Promise.resolve(null);

  return commentRepository.addComment({
    post,
    userId: author.id,
    body,
    now: time(daysAgo, 50),
  });
}

async function commentMany(
  post: PostRef | null,
  authors: ReadonlyArray<User>,
  body: (n: number) => string,
  daysAgo: number,
) {
  await Promise.all(
    authors.map((author, i) => comment(post, author, body(i + 1), daysAgo - i * 0.1)),
  );
}

async function recognize(
  reviewer: User,
  recipient: User,
  daysAgo: number,
  input: {
    description: string;
    markdown?: boolean;
    points: number;
    badgeIds?: ReadonlyArray<string>;
    links?: ReadonlyArray<{ title: string; url: string }>;
  },
): Promise<PostRef> {
  at(daysAgo);
  await recognitionService.publish(reviewer, {
    recipientId: recipient.id,
    description: input.description,
    descriptionMarkdown: input.markdown ?? false,
    points: input.points,
    badgeIds: input.badgeIds ?? [],
    links: input.links ?? [],
  });
  const [row] = await db
    .select({ id: recognitions.id })
    .from(recognitions)
    .where(and(eq(recognitions.recipientId, recipient.id), eq(recognitions.createdAt, clock.now())))
    .limit(1);
  if (row === undefined) throw new Error("The recognition just published was not found.");

  return {
    kind: "recognition",
    id: row.id,
  };
}

async function clearAll() {
  await db.delete(photoBackups);
  await db.delete(proofLikes);
  await db.delete(proofComments);
  await db.delete(proofPhotos);
  await db.delete(pointsLedger);
  await db.delete(recognitions);
  await db.delete(recognitionBadges);
  await db.delete(notifications);
  await db.delete(proofs);
  await db.delete(tasks);
  await db.delete(users);
  await db.delete(categories);
}

async function seed() {
  if (photosEnabled) await storage.ensureBucket();
  await clearAll();

  const members = await Promise.all(
    [3, 4, 5, 6, 7, 8].map((i) => signUp(`seed-pixel-${i}`, `Seed Pixel ${i}`, ["pixels"])),
  );
  const [m1, m2, m3, m4, m5, m6] = members as [
    Account,
    Account,
    Account,
    Account,
    Account,
    Account,
  ];
  const pixel1 = await signUp("seed-pixel-1", "Seed Pixel 1", ["pixels"]);
  const pixel2 = await signUp("seed-pixel-2", "Seed Pixel 2", ["pixels"]);
  const admin1 = await signUp("seed-admin-1", "Seed Admin 1", [...accessConfig.adminGroups]);
  const admin2 = await signUp("seed-admin-2", "Seed Admin 2", [...accessConfig.adminGroups]);
  const member1 = await signUp("seed-member-1", "Seed Member 1", ["members"]);
  const member2 = await signUp("seed-member-2", "Seed Member 2", ["members"]);
  const noGroup = await signUp("seed-no-group", "Seed No Group", []);
  const excluded = await signUp("seed-excluded", "Seed Excluded Pixel", ["pixels"]);
  const everyone = [...members, pixel1, pixel2, member1, member2, admin1, admin2, noGroup];

  const category = (name: string) =>
    categoryRepository.create({
      name,
      slug: name.toLowerCase().replaceAll(" ", "-"),
    });
  const cleaning = await category("Lapikud");
  const events = await category("Kultuur");
  const workshop = await category("Helpdesk");
  const writing = await category("Tarkvara");
  await category("Elektroonika");

  const task = (input: {
    title: string;
    description?: string;
    categoryId: string;
    points: number;
    policy: Task["policy"];
    cooldownDays?: number;
    photoRequired?: boolean;
    photoInstructions?: string;
    textRequired?: boolean;
  }) =>
    taskService.createTask(admin1, {
      title: input.title,
      description: input.description ?? "",
      categoryId: input.categoryId,
      points: input.points,
      policy: input.policy,
      cooldownSeconds: (input.cooldownDays ?? 0) * 86_400,
      photoRequired: input.photoRequired ?? false,
      photoInstructions: input.photoInstructions ?? "",
      textRequired: input.textRequired ?? false,
      showOnFeed: true,
    });

  at(120);
  const kitchen = await task({
    title: "Osale Pikslipeol",
    description: "Tule Pikslipeole ja tee peost pilt.",
    categoryId: cleaning.id,
    points: 100,
    policy: "repeatable",
    photoRequired: true,
    photoInstructions: "Pilt peolt, kus sind on näha.",
  });
  const recycling = await task({
    title: "Anna uue proliikme taski idee",
    categoryId: cleaning.id,
    points: 10,
    policy: "repeatable",
    cooldownDays: 7,
  });
  const openHouse = await task({
    title: "Osale Helpdeski teemalisel koolitusel",
    description: "Käi Helpdeski koolitusel ja jaga, mida õppisid.",
    categoryId: workshop.id,
    points: 75,
    policy: "one_per_user",
    photoRequired: true,
  });
  const party = await task({
    title: "Aita kaasa suurürituse korraldamisel",
    description: "Broneeri ruum, planeeri toit ja saada kutsed.",
    categoryId: cleaning.id,
    points: 200,
    policy: "single_winner",
    textRequired: true,
  });
  await task({
    title: "Disaini mingi ürituse jaoks plakat",
    description: "Üks A3 plakat klubi värvides.",
    categoryId: events.id,
    points: 100,
    policy: "single_winner",
    photoRequired: true,
    photoInstructions: "Lisa valmis plakat pildina.",
  });
  const printer = await task({
    title: "Osale Helpdeski taski tegemisel",
    description: "Aita Helpdeskil üks pilet lahendada.",
    categoryId: workshop.id,
    points: 100,
    policy: "single_winner",
    photoRequired: true,
  });
  const solderingGuide = await task({
    title: "Kirjuta jootmise juhend",
    description: "Lühike juhend algajale: tööriistad, ohutus, esimene projekt.",
    categoryId: writing.id,
    points: 50,
    policy: "one_per_user",
    textRequired: true,
  });
  const cableDrawer = await task({
    title: "Sorteeri kaablisahtel",
    categoryId: workshop.id,
    points: 20,
    policy: "one_per_user",
  });
  const weeklyUpdate = await task({
    title: "Kirjuta nädala kokkuvõte",
    description: "Kirjuta, mis su projektis sel nädalal juhtus.",
    categoryId: writing.id,
    points: 20,
    policy: "repeatable",
    textRequired: true,
  });
  const inventory = await task({
    title: "Tee laoruumis inventuur",
    description: "Loe laoruumi asjad üle ja uuenda tabelit.",
    categoryId: cleaning.id,
    points: 30,
    policy: "repeatable",
  });
  const anything = await task({
    title: "Bug bounty (leia bug ja tee issue või teavita sellest)",
    description: "Leidsid vea? Kirjelda seda, pildid ja tekst on valikulised.",
    categoryId: writing.id,
    points: 20,
    policy: "repeatable",
  });

  const kitchenMax = await approve(
    await submit(m2, kitchen, 5, {
      photos: maxPhotos,
      text: shortText,
    }),
    admin1,
    5,
  );
  const kitchenOne = await approve(
    await submit(m1, kitchen, 80, { photos: [photo.landscape] }),
    admin1,
    79,
  );
  await approve(
    await submit(m1, kitchen, 60, { photos: [photo.portrait, photo.square] }),
    admin2,
    60,
  );
  await approve(await submit(m1, kitchen, 45, { photos: [photo.wide] }), admin1, 44);
  await approve(
    await submit(m1, kitchen, 30, {
      photos: [photo.tall],
      text: longText,
    }),
    admin2,
    30,
  );
  await reject(
    await submit(m6, kitchen, 4, { photos: [photo.small] }),
    admin1,
    3,
    "The photo does not show the sink.",
  );
  await submit(m3, kitchen, 1, { photos: [photo.square] });

  await approve(await submit(m4, recycling, 30), admin1, 30);
  await approve(await submit(m4, recycling, 20), admin1, 20);
  await approve(await submit(m3, recycling, 2), admin2, 2);

  await approve(await submit(m1, openHouse, 50, { photos: [photo.portrait] }), admin1, 49);
  await reject(await submit(m4, openHouse, 14, { photos: [photo.landscape] }), admin2, 13, null);
  await submit(m2, openHouse, 2, { photos: [photo.square, photo.tall, photo.wide] });

  await approve(await submit(m2, party, 4, { text: longText }), admin1, 3);

  await submit(m3, printer, 1, {
    photos: [photo.landscape],
    text: shortText,
    reviewers: [admin1, admin2],
  });

  await approve(
    await submit(m1, solderingGuide, 35, {
      text: markdownText,
      markdown: true,
    }),
    admin2,
    34,
  );
  await reject(
    await submit(m5, solderingGuide, 9, { text: longText }),
    admin1,
    8,
    "This reads like a cleaning report, not a soldering guide. Please add the steps and the safety notes.",
  );
  await submit(m6, solderingGuide, 1, {
    text: markdownText,
    markdown: true,
    reviewers: [admin2],
  });

  await approve(await submit(m1, cableDrawer, 70), admin1, 70);
  at(65);
  await taskService.archiveTask(admin1, cableDrawer.id, true);

  const updateMarkdown = await approve(
    await submit(m2, weeklyUpdate, 8, {
      text: markdownText,
      markdown: true,
    }),
    admin1,
    7,
  );
  await approve(await submit(m2, weeklyUpdate, 6, { text: markdownText }), admin1, 6);
  await approve(await submit(m3, weeklyUpdate, 11, { text: longText }), admin2, 10);
  await submit(m4, weeklyUpdate, 0, { text: shortText });

  await approve(await submit(m3, inventory, 25), admin1, 24);
  at(23);
  await taskRepository.update(inventory.id, {
    ...inventory,
    points: 0,
  });
  await approve(await submit(m4, inventory, 22), admin1, 21);
  await submit(m5, inventory, 18);
  at(17);
  await taskService.removeTask(admin2, inventory.id);

  await approve(await submit(m5, anything, 12), admin1, 12);
  await approve(await submit(m6, anything, 16, { text: shortText }), admin2, 15);
  const anythingPhoto = await approve(
    await submit(m3, anything, 9, { photos: [photo.landscape] }),
    admin1,
    9,
  );
  await approve(
    await submit(pixel2, anything, 27, {
      text: markdownText,
      markdown: true,
    }),
    admin1,
    27,
  );
  await submit(m4, anything, 1, {
    text: shortText,
    photos: [photo.portrait, photo.small],
  });
  await approve(await submit(excluded, anything, 19, { text: shortText }), admin1, 19);

  at(11);
  const ownApproved = await proofService.addOwnTask(pixel1, {
    title: "Ehitasin töölaua ümber",
    description: "Vana loksus, vahetasin jalad ja lisasin riiuli.",
    categoryId: workshop.id,
    points: 50,
    objectKeys: await uploadAll(pixel1, photosEnabled ? [photo.square] : []),
    reviewerIds: [admin1.id],
  });
  await approve(ownApproved, admin1, 10, 80);
  at(1);
  await proofService.addOwnTask(pixel1, {
    title: "Värvisin klubiruumi ukse",
    description: "Kaks kihti, sama värv mis enne.",
    categoryId: cleaning.id,
    points: 30,
    objectKeys: await uploadAll(pixel1, photosEnabled ? [photo.tall] : []),
    reviewerIds: [admin2.id],
  });
  at(2);
  await taskService.suggestTask(member1, {
    title: "Korralda lauamänguõhtu",
    description: "Too mängud kaasa ja kutsu uued liikmed.",
    categoryId: events.id,
    points: 40,
    policy: "one_per_user",
    cooldownSeconds: 0,
    photoRequired: true,
    photoInstructions: "Pilt mänguõhtult.",
    textRequired: false,
    showOnFeed: true,
  });
  await taskService.suggestTask(member2, {
    title: "Kirjuta klubi ajaloost",
    description: "",
    categoryId: writing.id,
    points: 75,
    policy: "single_winner",
    cooldownSeconds: 0,
    photoRequired: false,
    photoInstructions: "",
    textRequired: true,
    showOnFeed: true,
  });
  at(7);
  const ownRejected = await proofService.addOwnTask(pixel2, {
    title: "Ostsin uued kruusid",
    description: "Kuus kruusi kööki.",
    categoryId: cleaning.id,
    points: 40,
    objectKeys: [],
    reviewerIds: [],
  });
  await reject(
    ownRejected,
    admin1,
    6,
    "Buying things is not an own task. Ask for a refund instead.",
  );

  at(90);
  const badge = (label: string, imageUrl: string | null) =>
    recognitionService.createBadge(admin1, {
      label,
      imageUrl,
    });
  const emoji = (code: string) =>
    `https://github.githubassets.com/images/icons/emoji/unicode/${code}.png`;
  const helpingHand = await badge("Helping hand", emoji("1f3c6"));
  const nightOwl = await badge("Night owl", emoji("1f989"));
  const organiser = await badge("Organiser", null);
  const mentor = await badge("Mentor", null);
  const toolbox = await badge("Toolbox", emoji("1f9f0"));
  const photographer = await badge("Photographer", emoji("1f4f8"));
  await badge("Unused badge", null);

  await recognize(admin1, m1, 75, {
    description: "Ran the whole intake week.",
    points: 150,
    badgeIds: [helpingHand.id, organiser.id],
  });
  const recognitionMarkdown = await recognize(admin2, m1, 40, {
    description:
      "Mentored **three** new members through their first project.\n\n- Weekly check-ins\n- Code reviews\n- A [write-up](https://example.org/mentoring) for the next mentor",
    markdown: true,
    points: 100,
    badgeIds: [nightOwl.id, mentor.id, toolbox.id],
    links: [
      {
        title: "Mentoring notes",
        url: "https://example.org/mentoring",
      },
    ],
  });
  await recognize(admin1, m1, 26, {
    description: longText,
    points: 75,
    badgeIds: [photographer.id],
    links: [
      {
        title: "Photo album",
        url: "https://example.org/album",
      },
      {
        title: "Event page",
        url: "https://example.org/event",
      },
      {
        title: "Follow-up survey",
        url: "https://example.org/survey",
      },
    ],
  });
  const recognitionPlain = await recognize(admin2, m2, 2, {
    description: "Fixed the door lock before anyone else noticed it was broken.",
    points: 100,
  });
  await recognize(admin1, m3, 6, {
    description:
      "## Workshop night\n\nHosted the *soldering* evening and wrote up `notes.md` for everyone who missed it.",
    markdown: true,
    points: 50,
    links: [
      {
        title: "Workshop notes",
        url: "https://example.org/notes",
      },
      {
        title: "Parts list",
        url: "https://example.org/parts",
      },
    ],
  });
  await recognize(admin1, excluded, 19, {
    description: "Helped move the furniture.",
    points: 25,
    badgeIds: [helpingHand.id],
  });
  await userRepository.setExcluded({
    userId: excluded.id,
    excluded: true,
  });

  const kitchenPost = proofPost(kitchenMax);
  await like(kitchenPost, everyone, 4);
  await commentMany(
    kitchenPost,
    [m1, m3, pixel1, noGroup, admin2],
    (n) => `Comment ${n}: looks spotless!`,
    4,
  );
  await comment(kitchenPost, m4, longComment, 3.4);
  const removed = await comment(kitchenPost, m6, "Oops, wrong post.", 3.3);
  if (removed) await commentRepository.softDeleteComment(removed.id, time(3.3, 55));

  const singlePost = proofPost(kitchenOne);
  await like(singlePost, [m2], 78);
  await comment(singlePost, m2, "Nice!", 78);

  await like(proofPost(updateMarkdown), [m1, m3, noGroup], 6);
  await like(proofPost(anythingPhoto), [m5], 8);

  await like(recognitionMarkdown, everyone, 39);
  await commentMany(
    recognitionMarkdown,
    [m2, m3, m5, pixel2, admin1],
    (n) => `Well deserved, ${n}!`,
    39,
  );
  await comment(recognitionMarkdown, m6, longComment, 38.4);
  const removedOnRecognition = await comment(recognitionMarkdown, m4, "Deleted later.", 38.3);
  if (removedOnRecognition) {
    await commentRepository.softDeleteComment(removedOnRecognition.id, time(38.3, 55));
  }
  await like(recognitionPlain, [m1], 1);
  await comment(recognitionPlain, m1, "Thank you!", 1);
}

async function report() {
  const statuses = await db
    .select({
      status: proofs.status,
      count: count(),
    })
    .from(proofs)
    .groupBy(proofs.status);
  say("\nRows:");
  say({
    users: await db.$count(users),
    categories: await db.$count(categories),
    tasks: await db.$count(tasks),
    proofs: await db.$count(proofs),
    photos: await db.$count(proofPhotos),
    recognitions: await db.$count(recognitions),
    badges: await db.$count(recognitionBadges),
    likes: await db.$count(proofLikes),
    comments: await db.$count(proofComments),
    ledger: await db.$count(pointsLedger),
  });
  say("Proofs by status:", Object.fromEntries(statuses.map((s) => [s.status, s.count])));

  const now = new Date();
  const top = async (since?: Date) =>
    (
      await leaderboardRepository.leaderboard(
        since
          ? {
              since,
              limit: 5,
            }
          : { limit: 5 },
      )
    ).map((row) => `${row.user.displayName} ${row.totalPoints}`);
  say("Leaderboard all time:", await top());
  say("Leaderboard this month:", await top(new Date(now.getFullYear(), now.getMonth(), 1)));
  if (skippedPhotoCases > 0) {
    say(`Skipped ${skippedPhotoCases} proofs that need photos.`);
  }
}

seed()
  .then(report)
  .finally(() => client.end())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
