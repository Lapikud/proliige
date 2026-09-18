# Proliige: SPEC

What the app does and the rules it must keep. This file explains what the code is for.

## Purpose

Proliige ("pro member") is Lapikud's membership app. Lapikud pixels do things for the club: tidy the room, run an event, restock the fridge. The app lists those tasks, lets pixels prove they did one, lets the board approve it, and turns approvals into points. The feed and leaderboard make the work visible to everyone.

## People

Everyone signs in with their existing FreeIPA account. The app never creates or stores passwords. A user's role comes from their FreeIPA groups on each sign-in (`src/config/access.ts`):

| Role    | Groups              | Summary                          |
| ------- | ------------------- | -------------------------------- |
| Visitor | not signed in       | Reads public pages               |
| Account | any other FreeIPA   | Likes, comments, gets notified   |
| Member  | `pixels`, `members` | Does tasks and submits proofs    |
| Admin   | `team_juhatus`      | Reviews proofs and manages tasks |

Admin replaces member: someone in both groups is an admin and never submits proofs, so nobody approves their own work.

## Permissions

Every permission is a named rule in `src/domain/rules.ts`. Services enforce them; pages and navigation ask the same rules to decide what to show.

| Rule                       | Who                                        |
| -------------------------- | ------------------------------------------ |
| `userCanViewFeed`          | Everyone                                   |
| `userCanViewLeaderboard`   | Everyone                                   |
| `userCanViewProfiles`      | Everyone                                   |
| `userCanReactToProofs`     | Signed in                                  |
| `userCanReadNotifications` | Signed in                                  |
| `userCanBrowseTasks`       | Members                                    |
| `userCanSubmitProof`       | Members                                    |
| `userCanReviewProofs`      | Admins                                     |
| `userCanManageTasks`       | Admins                                     |
| `userCanManageCategories`  | Admins                                     |
| `userCanDeleteComment`     | The comment's author, or an admin          |
| `userCanViewPhoto`         | Everyone if approved; else owner or admins |

After signing in, admins land on the review queue, members on tasks, everyone else on the feed.

## Tasks

A task has a title, description, category, points, a completion policy, and optionally required photos with instructions. Admins create, edit and archive tasks. An archived task accepts no new proofs but keeps its history and points.

### Completion policies

A policy decides whether a member may submit a proof (`src/domain/completionPolicy.ts`). Pending and approved proofs count; rejected ones do not.

| Policy          | A new proof is refused when                                     |
| --------------- | --------------------------------------------------------------- |
| `single_winner` | Anyone has a pending or approved proof for it                   |
| `one_per_user`  | This member already has an approved proof                       |
| `repeatable`    | This member's last approval is younger than the task's cooldown |

On top of the policy, a proof is always refused when the task is archived or the member already has a pending proof for it.

The check runs twice: once in the service for a quick answer, and again in the database transaction with the task row locked, so two simultaneous submissions cannot both get through.

## Proofs

1. A member picks a task, uploads photos straight to storage, and submits.
2. The proof is **pending**. The member may request admins as reviewers, like reviewers on a pull request.
3. Any admin may approve or reject any pending proof, requested or not. A rejection may carry a reason.
4. **Approved**: the task's points are written to the points ledger once, and the proof appears in the feed.
5. **Rejected**: nothing is awarded, and the member may submit again if the policy allows.

A proof is reviewed once; a second review of the same proof changes nothing.

### Photos

- JPEG, PNG or WebP; size and count limits come from `NEXT_PUBLIC_PHOTO_MAX_FILE_SIZE_BYTES` and `NEXT_PUBLIC_PHOTO_MAX_PER_PROOF` (default 5 MB, 5 photos).
- A task either requires photos or refuses them.
- Uploads use short-lived signed URLs, and a member can only attach photos they uploaded.
- The bucket is private. The app serves photos itself and applies `userCanViewPhoto`.

## Feed and reactions

The feed shows approved proofs, newest first, 20 per page, filterable by one category. Signed-in users can like a proof and comment on it:

- Comments are at most 500 characters, and at most 5 per minute per user.
- Comments are soft-deleted by their author or an admin.
- Only approved proofs accept likes and comments.

## Leaderboard and user pages

The leaderboard ranks users by points, ties broken by name. It shows all time or this month, where the month starts in Europe/Tallinn time. The top three are marked gold, silver and bronze.

Each user has a public page at `/users/[userId]` with their rank, points, number of completed tasks, a chart of their points, and their completed tasks.

## Notifications

Stored in PostgreSQL, shown in the app live, and sent as Web Push when the browser allows it and push is configured.

| Event              | Who is notified                                 |
| ------------------ | ----------------------------------------------- |
| Review requested   | Each requested reviewer                         |
| Proof approved     | The proof's owner, with the points earned       |
| Proof rejected     | The proof's owner, with the reason if any       |
| Comment on a proof | The proof's owner, unless they wrote it         |
| Reply in a thread  | Earlier commenters, except the writer and owner |

A proof submitted without requested reviewers notifies nobody; it waits in the review queue.

## Background jobs

Run by pg-boss in the app's own database:

- `push-delivery`: one job per browser per notification, retried with backoff.
- `photo-backup`: every Sunday at 03:00 Europe/Tallinn, copies photos not yet backed up from Garage to Nextcloud. It is off unless Nextcloud is configured.

## Configuration

Every setting is listed in `.env.example` and validated at startup by `src/env.config.ts`. Groups of settings are all-or-nothing: Garage (unless storage is `memory`), Nextcloud, and Web Push.
