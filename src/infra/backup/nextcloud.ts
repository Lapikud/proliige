import { dirname } from "node:path/posix";
import { createClient, type WebDAVClient } from "webdav";
import type { BackupDestination } from "~/core/ports/backup";

export interface NextcloudSettings {
  readonly url: string;
  readonly username: string;
  readonly password: string;
  readonly basePath: string;
}

export function createNextcloudBackup(settings: NextcloudSettings): BackupDestination {
  const client = createClient(settings.url, {
    username: settings.username,
    password: settings.password,
  });
  const base = settings.basePath.replace(/\/+$/, "");

  return {
    async upload(path, contents) {
      const target = `${base}/${path}`;
      await ensureDirectory(client, dirname(target));
      await client.putFileContents(target, Buffer.from(contents), { overwrite: true });
    },
  };
}

async function ensureDirectory(client: WebDAVClient, path: string): Promise<void> {
  let current = "";
  for (const segment of path.split("/").filter((part) => part.length > 0)) {
    current += `/${segment}`;
    if (!(await client.exists(current))) {
      await client.createDirectory(current);
    }
  }
}
