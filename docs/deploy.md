# Deploying

[`ci.yml`](../.github/workflows/ci.yml) runs on every pull request: format check, lint, typecheck, tests against a throwaway PostgreSQL, and a production build. [`deploy.yml`](../.github/workflows/deploy.yml) runs on every push to `main`: it runs the same checks, then [`remote.sh`](../scripts/deploy/remote.sh) SSHes into the LXC container and runs [`deploy.sh`](../scripts/deploy/deploy.sh).

## What a deploy does

Everything lives in `/opt/proliige`:

```
.env            production settings, written from the ENV_FILE secret
repo/           clone of main; deploy.sh runs from here
releases/<id>/  one built copy of the app per deploy
current         symlink to the release systemd runs
```

`deploy.sh` writes the `.env` it receives on stdin, resets `repo/` to `origin/main`, and builds a new release next to the live one, so the site keeps working during the build. It then runs migrations, points `current` at the new release, restarts the service and waits for it to answer on `localhost:3000`. The site is down only for the restart.

If anything fails before the switch, the live release keeps running and the half-built one is deleted. If the new release doesn't come up, `current` goes back to the previous release and the service restarts. The last three releases are kept.

Things to keep in mind:

- **Migrations can't be undone.** A rollback only changes the code, and migrations run while the old release is still live, so each migration must also work with the code before it. To drop or rename a column, stop using it in one deploy and remove it in the next.
- **It deploys `main` as it is when the deploy starts.** Deploys run one at a time, so a push that lands during a deploy is picked up by the next one.
- **The build runs on the container.** `next build` needs about 2 GB of memory, so give the LXC at least that.

## Setting up the LXC container

As root, once. PostgreSQL and Garage already run there as `postgresql.service` and `garage.service`.

1. Install Node 22.12+, git and curl, then `corepack enable` so `pnpm` is on the system `PATH`. The forced ssh command runs without a login shell.
2. Create the user and the layout, and let it read the service's logs so a failed deploy shows them:

   ```sh
   useradd --system --create-home --home-dir /home/proliige --shell /bin/bash proliige
   usermod -aG systemd-journal proliige
   install -d -o proliige -g proliige /opt/proliige
   sudo -u proliige git clone https://github.com/Lapikud/proliige.git /opt/proliige/repo
   sudo -u proliige ln -s /opt/proliige /home/proliige/repo
   ```

   `/home/proliige/repo` is only a shortcut to `/opt/proliige`, so the clone itself is at `~/repo/repo`. The service, sudoers and `authorized_keys` use the real `/opt/proliige` paths.

3. Put the production settings, based on `.env.example`, in `/opt/proliige/.env` (owned by `proliige`, `chmod 600`) and in the `ENV_FILE` secret (see below). `SITE_URL` must be the public address. From then on, each deploy overwrites the file with the secret.
4. Point the existing `proliige.service` unit at the releases and let `proliige` restart it without a password. `deploy.sh` expects the unit to be called `proliige`, run from `WorkingDirectory=/opt/proliige/current`, load `EnvironmentFile=/opt/proliige/.env` and listen on port 3000 (`next start -p 3000`):

   ```sh
   systemctl daemon-reload
   systemctl enable proliige
   echo 'proliige ALL=(root) NOPASSWD: /usr/bin/systemctl restart proliige' > /etc/sudoers.d/proliige
   chmod 440 /etc/sudoers.d/proliige
   ```

5. Make a deploy key and pin it to the deploy script, so the key can do nothing else:

   ```sh
   ssh-keygen -t ed25519 -N '' -C proliige-deploy -f deploy_key
   install -d -m 700 -o proliige -g proliige ~proliige/.ssh
   echo "command=\"/opt/proliige/repo/scripts/deploy/deploy.sh\",restrict $(cat deploy_key.pub)" >> ~proliige/.ssh/authorized_keys
   chown proliige: ~proliige/.ssh/authorized_keys
   chmod 600 ~proliige/.ssh/authorized_keys
   ```

6. Deploy once by hand to check everything works: `sudo -u proliige /opt/proliige/repo/scripts/deploy/deploy.sh`.
7. Point the reverse proxy at `localhost:3000`.

### Moving over from the old setup

The app used to be checked out directly in `/opt/proliige`, with the service running from there. To switch to releases, keep `/opt/proliige/.env`, move everything else out of the way (to `/opt/proliige.old`, say), then follow steps 2 to 6. The site is down from `systemctl daemon-reload` until the first deploy finishes. Delete `/opt/proliige.old` once the new setup works.

## GitHub settings

Create an environment named `production` (Settings → Environments) and give it these secrets:

| Secret               | Value                                                                |
| -------------------- | -------------------------------------------------------------------- |
| `DEPLOY_HOST`        | Address GitHub's runners can reach the container at                  |
| `DEPLOY_PORT`        | SSH port, if not 22                                                  |
| `DEPLOY_USER`        | `proliige`                                                           |
| `DEPLOY_SSH_KEY`     | Contents of `deploy_key` (the private half); then delete the file    |
| `DEPLOY_KNOWN_HOSTS` | Output of `ssh-keyscan -p <port> <host>`, checked against the server |
| `ENV_FILE`           | The whole production `.env`                                          |

The environment can also require an approval or limit deploys to `main`.

To deploy from your own machine, run `scripts/deploy/remote.sh` with the same variables set.
