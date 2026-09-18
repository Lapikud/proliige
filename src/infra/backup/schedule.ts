import { type Boss, ensureQueue } from "../queue";

const QUEUE = "photo-backup";
const EVERY_SUNDAY_AT_THREE = "0 3 * * 0";

export async function schedulePhotoBackup(
  boss: Boss,
  backUp: () => Promise<unknown>,
): Promise<void> {
  const running = await boss();
  await ensureQueue(running, QUEUE);
  await running.schedule(QUEUE, EVERY_SUNDAY_AT_THREE, null, { tz: "Europe/Tallinn" });
  await running.work(QUEUE, async () => {
    await backUp();
  });
}
