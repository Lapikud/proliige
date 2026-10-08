# Deploying

[`ci.yml`](../.github/workflows/ci.yml) runs on every pull request: format check, lint, typecheck, tests against a throwaway PostgreSQL, a test of `deploy.sh` against a scratch folder ([`deploy-test.sh`](../scripts/ci/deploy-test.sh)), a production build, and a smoke test that starts the build and requests the main pages ([`smoke.sh`](../scripts/ci/smoke.sh)).

The LXC container can't be reached from the internet, so GitHub never connects to it. Instead:

1. On every push to `main`, [`deploy.yml`](../.github/workflows/deploy.yml) runs the same checks and, if they pass, pushes `main` to `git.lapikud.ee`.
2. That push starts [`.gitea/workflows/deploy.yml`](../.gitea/workflows/deploy.yml) on a Gitea runner inside the container, which checks out the pushed commit and runs its [`deploy.sh`](../scripts/deploy/deploy.sh).

GitHub stays the place for code, issues and pull requests. The Gitea repo only receives `main` after it has passed CI, and the container deploys from it, so a commit that failed CI can't be deployed.

## What a deploy does

Everything lives in `/opt/proliige`:

```
.env            production settings, kept only on the server
repo/           clone of the Gitea repo; releases are built from it
releases/<id>/  one built copy of the app per deploy
current         symlink to the release systemd runs
```

`deploy.sh` resets `repo/` to the Gitea repo's `main` and builds a new release next to the live one, so the site keeps working during the build. It then runs migrations, points `current` at the new release, restarts the service and waits for it to answer on `localhost:3000`. The site is down only for the restart.

If anything fails before the switch, the live release keeps running and the half-built one is deleted. If the new release doesn't come up, `current` goes back to the previous release and the service restarts. The last three releases are kept.

Things to keep in mind:

- **Migrations can't be undone.** A rollback only changes the code, and migrations run while the old release is still live, so each migration must also work with the code before it. To drop or rename a column, stop using it in one deploy and remove it in the next.
- **Deploys wait for each other.** If `main` moves while one runs, the next deploy picks up the newest commit that passed CI.
- **The build runs on the container.** `next build` needs about 2 GB of memory, so give the LXC at least that.

## Gitea settings

1. Create an empty, public `proliige` repo on `git.lapikud.ee`, with Actions turned on. Turn off its issues and pull requests so nobody uses them instead of GitHub's. It only mirrors the public GitHub repo; if you make it private, clone it in step 2 below with a read-only token in the URL.
2. Under the repo's Settings → Actions → Runners, create a runner registration token and use it in step 7 below. A runner registered to the repo only runs that repo's workflows.
3. Create an access token with the `write:repository` scope for the account that will push, ideally a bot account that can write to this repo only.

Anyone who can push to the Gitea repo can run code on the container as `proliige`, so keep write access to that account.

## Setting up the LXC container

As root, once. PostgreSQL and Garage already run there as `postgresql.service` and `garage.service`.

1. Install Node 22.12+, git and curl, then `corepack enable` so `pnpm` is on the system `PATH`. The runner doesn't use a login shell.
2. Create the user and the layout, and let it read the service's logs so a failed deploy shows them:

   ```sh
   useradd --system --create-home --home-dir /home/proliige --shell /bin/bash proliige
   usermod -aG systemd-journal proliige
   install -d -o proliige -g proliige /opt/proliige
   sudo -u proliige git clone https://git.lapikud.ee/<owner>/proliige.git /opt/proliige/repo
   sudo -u proliige ln -s /opt/proliige /home/proliige/repo
   ```

   `/home/proliige/repo` is only a shortcut to `/opt/proliige`, so the clone itself is at `~/repo/repo`. The service, sudoers and runner use the real `/opt/proliige` paths.

3. Put the production settings, based on `.env.example`, in `/opt/proliige/.env`, owned by `proliige` and `chmod 600`. `SITE_URL` must be the public address. Deploys never change this file; edit it on the server and restart the service.
4. Point the existing `proliige.service` unit at the releases and let `proliige` restart it without a password. `deploy.sh` expects the unit to be called `proliige`, run from `WorkingDirectory=/opt/proliige/current`, load `EnvironmentFile=/opt/proliige/.env` and listen on port 3000 (`next start -p 3000`):

   ```sh
   systemctl daemon-reload
   systemctl enable proliige
   echo 'proliige ALL=(root) NOPASSWD: /usr/bin/systemctl restart proliige' > /etc/sudoers.d/proliige
   chmod 440 /etc/sudoers.d/proliige
   ```

5. Deploy once by hand to check everything works: `sudo -u proliige /opt/proliige/repo/scripts/deploy/deploy.sh`. The Gitea repo needs `main` for this, so push it there first (the GitHub workflow does it on its next run, or push it yourself).
6. Point the reverse proxy at `localhost:3000`.
7. Install [act_runner](https://docs.gitea.com/usage/actions/act-runner) and register it with the Gitea repo, running as `proliige` in host mode with the `proliige` label:

   ```sh
   sudo -u proliige act_runner register --no-interactive \
     --instance https://git.lapikud.ee --token <registration token> \
     --name proliige-lxc --labels proliige:host
   ```

   Host mode runs jobs directly on the container, which `deploy.sh` needs; the label makes sure only this runner picks up the deploy. `register` writes `.runner` in the current directory, so run it from `/home/proliige`. Then start it with the container, from `/etc/systemd/system/act_runner.service`:

   ```ini
   [Unit]
   Description=Gitea Actions runner
   After=network-online.target
   Wants=network-online.target

   [Service]
   User=proliige
   WorkingDirectory=/home/proliige
   # Jobs need node (for actions/checkout), pnpm, git and systemctl from here.
   Environment=PATH=/usr/local/bin:/usr/bin:/bin
   ExecStart=/usr/local/bin/act_runner daemon
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   ```sh
   systemctl daemon-reload
   systemctl enable --now act_runner
   ```

### Moving over from the old setup

The app used to be checked out directly in `/opt/proliige`, with the service running from there. To switch to releases, keep `/opt/proliige/.env`, move everything else out of the way (to `/opt/proliige.old`, say), then follow steps 2 to 5. The site is down from `systemctl daemon-reload` until the first deploy finishes. Delete `/opt/proliige.old` once the new setup works.

## GitHub settings

Create an environment named `production` (Settings → Environments) and give it one secret:

| Secret         | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| `GITEA_REMOTE` | `https://<user>:<token>@git.lapikud.ee/<owner>/proliige.git` |

The environment can also require an approval or limit deploys to `main`.

Pretty much done by Rene.