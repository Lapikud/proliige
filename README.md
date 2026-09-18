# Proliige

Proliige ("pro member") is Lapikud's membership app, for working your way to becoming a member. People do club tasks, submit proof, and earn points when a reviewer approves it. Everyone can follow the feed of completed tasks, the leaderboard, and each person's page.

Built with Next.js, PostgreSQL (Drizzle), pg-boss background jobs, FreeIPA sign-in, Garage photo storage, Tailwind and shadcn/ui.

[SPEC.md](SPEC.md) describes what the app does and the rules it keeps; this README is about working on the code.

## Getting started

You need Node 22.12+, pnpm and Docker.

```sh
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm garage:setup      # writes garage.toml, starts Garage, prints a key for .env; run again after filling it
pnpm db:migrate
pnpm dev               # http://localhost:3000
```

`.env.example` lists every setting; set `SITE_URL` to the public address so link previews and the sitemap point at it. The app refuses to start while one is missing or invalid, and says which. `.env` and `garage.toml` hold secrets, so both are ignored by git and never archived; their templates are `.env.example` and `garage.example.toml`.

## Everyday commands

| Command                          | What it does                                         |
| -------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                       | Run the app with hot reload                          |
| `pnpm test`                      | Run all tests (uses its own `lapikud_test` database) |
| `pnpm typecheck`                 | Check types                                          |
| `pnpm lint`                      | Check code rules                                     |
| `pnpm format`                    | Format everything with Prettier                      |
| `pnpm build`                     | Production build                                     |
| `pnpm db:generate`               | Write a migration after changing a `model.ts`        |
| `pnpm db:migrate`                | Apply migrations                                     |
| `pnpm garage:setup [app-origin]` | Prepare Garage: config, layout, bucket, key, CORS    |

Before opening a pull request, run `pnpm format && pnpm lint && pnpm typecheck && pnpm test`.

## Glossary

The same words are used in the code, the database and the screens.

| Word            | Meaning                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| **User**        | Anyone who signed in with a FreeIPA account                                                |
| **Role**        | What a user may do, derived from their FreeIPA groups: `member` or `admin`                 |
| **Member**      | A user in a member group (`pixels`, `members`); does tasks                                 |
| **Admin**       | A user in an admin group (`team_juhatus`); reviews proofs and manages tasks, never submits |
| **Task**        | Something to do for the club, worth points, in a **category**                              |
| **Policy**      | How often a task can be done: once per user, repeatable, first one wins                    |
| **Proof**       | What a member submits to show they did a task, often with photos                           |
| **Reviewer**    | An admin asked to review a proof, like a reviewer on a pull request                        |
| **Review**      | Approving or rejecting a proof; any admin may review any proof                             |
| **Points**      | Awarded when a proof is approved, recorded in the points ledger                            |
| **Feed**        | Approved proofs, newest first, with likes and comments                                     |
| **Leaderboard** | Users ranked by points, all time or this month                                             |
| **Rule**        | A yes/no check of what a user may do, such as `userCanSubmitProof`                         |

Who can do what:

| Who                 | Can                                                              |
| ------------------- | ---------------------------------------------------------------- |
| Visitor             | Read the feed, the leaderboard and user pages                    |
| Signed in, no group | Also like, comment, and get notified of replies                  |
| Member              | Also browse tasks, submit proofs, and request reviewers          |
| Admin               | Review proofs, manage tasks and categories; never submits proofs |

A proof with requested reviewers notifies them; without any, nobody is notified and it simply waits in the review queue. Groups are set in `src/config/access.ts`. Every rule lives in `src/domain/rules.ts`.

## How the code is organised

Code depends inwards only: `app` and `components` use `infra`, `infra` implements `core`, and `core` builds on `domain`.

```
src/
  domain/       Plain types and pure functions: what a proof, task or rule is. No database, no React.
  core/
    ports/      Interfaces the services need, such as ProofRepository or PushPort.
    services/   One per resource. Each method is wrapped in guard(rule, …), so permissions are never skipped.
  infra/        Implementations of the ports: Drizzle repositories, Garage storage, FreeIPA, Web Push, the job queue.
    index.ts    Builds every adapter and service; the only thing app code imports from infra.
  app/          Next.js routes only. Pages are grouped by who they are for: (public), (member),
                (account), admin/. The root holds Next's special files (layout, errors, metadata).
  components/   UI grouped by feature (feed/, proof/, review/, leaderboard/, profile/…); ui/ holds the basics.
  actions/      Server actions: what forms submit, one folder per resource.
  lib/          Small shared helpers: server actions, forms, navigation, dates, logging.
  config/       Settings in code: site name and colours, access groups, photo limits, feed paging.
tests/
  domain/       Pure tests of domain logic and rules.
  integration/  Services against a real database.
```

### Following one request

Submitting a proof, from click to database:

1. `components/proof/form.tsx` validates the form with `actions/proof/schema.ts` and calls `submitProofAction`.
2. `actions/proof/index.ts` wraps the call in `action()`, which validates again on the server and finds the signed-in user.
3. `core/services/proof.ts` `submitProof` is guarded by `userCanSubmitProof`, checks the task's policy, and saves through `ProofRepository`.
4. `infra/db/proof/submit.ts` writes the proof, its photos and requested reviewers in one transaction.
5. The service notifies the requested reviewers through `NotificationPort`, which queues a Web Push for each of their browsers.

### Adding a feature

The user page (`/users/[userId]`) is a small, complete example:

1. **Rule**: `userCanViewProfiles` in `domain/rules.ts`.
2. **Port**: the data it needs, here the feed's `authorId` filter in `core/ports/feed.ts`.
3. **Infra**: the query in `infra/db/feed/repo.ts`.
4. **Service**: `core/services/user.ts`, registered in `infra/index.ts`.
5. **Page and components**: `app/(public)/users/[userId]/page.tsx` and `components/profile/`.
6. **Tests**: rules in `tests/domain/`, queries in `tests/integration/`.

## Conventions

**Files**

- Name `.ts` and `.tsx` files in camelCase: `photoCarousel.tsx`.
- Don't repeat the folder in the file name: `feed/card.tsx`, not `feed/feedCard.tsx`.
- Next.js files and route folders keep Next's names: `page.tsx`, `not-found.tsx`, `[userId]/`.
- Other files keep their usual names: `lapikud-logo.svg`, `setup.sh`.
- Write code in TypeScript. The exceptions are `public/serviceWorker.js` and the shell scripts in `scripts/`.

**Code**

- Check permissions with a rule from `domain/rules.ts`. Never check roles directly.
- Comment only what someone could otherwise break by accident.
- Let Prettier format the code. It also sorts Tailwind classes.
- Don't edit `components/ui/chart.tsx` by hand; update it with `npx shadcn add chart`.

## Configuration notes

### Photos

Browsers upload photos straight to Garage using short-lived signed URLs, so the bucket needs CORS for the app's origin; `pnpm garage:setup` sets it. Keep the bucket private: approved photos are served through the app, and pending or rejected ones only to their owner and admins.

### Notifications

Notifications are stored in PostgreSQL and delivered live over `/api/notifications/stream`. Allow long-lived connections and turn off proxy buffering for that path.

Web Push delivers them with the site closed. Generate keys with `npx web-push generate-vapid-keys` and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`, or leave all three empty to turn push off. People turn desktop notifications on from the notifications page; signing out turns them off for that browser.

### Background jobs

Slow or unreliable work runs as jobs in [pg-boss](https://github.com/timgit/pg-boss), a queue stored in the same PostgreSQL database under the `pgboss` schema, so there is nothing extra to run. Workers start with the server (`src/instrumentation.ts` calls `startWorkers()`). Failed jobs are retried five times with growing delays.

There are two queues: `push-delivery` (one job per browser per notification, five sent at a time) and `photo-backup` (the weekly backup below, scheduled with pg-boss). To add a job, follow `src/infra/push/webPush.ts` or `src/infra/backup/schedule.ts`.

### Logging

Server errors are written as JSON to stdout and, in development, to `logs/app.log`. Set `LOG_FILE` for a durable path and `LOG_LEVEL` to `debug`, `info`, `warn` or `error`. Secrets, cookies and tokens are redacted.

### Weekly photo backups

Photos can grow large, so every Sunday at 03:00 (Europe/Tallinn) a background job copies new proof photos from Garage to Nextcloud over WebDAV, under `NEXTCLOUD_BACKUP_PATH` with the same paths as in the bucket. Each photo is copied once; the `photo_backups` table records what is already there. Set `NEXTCLOUD_WEBDAV_URL`, `NEXTCLOUD_USERNAME` and `NEXTCLOUD_PASSWORD` to turn it on.
