# Deployment

Settle ships as two images built from `docker/Dockerfile`, run with Docker Compose on a server reached over SSH:

- `ghcr.io/ame180/settle-php` (`prod` target): PHP-FPM with the app, vendor dependencies and the built frontend. Applies migrations on start.
- `ghcr.io/ame180/settle-web` (`web` target): nginx serving `public/` and passing PHP requests to the `php` service.

`deploy/compose.yaml` runs both with MariaDB. TLS and the public hostname come from a reverse proxy in front of `web`.

| Environment | Deployed by | Image tag |
| --- | --- | --- |
| `staging` | Running the Deploy workflow on any branch | `sha-<commit>` |
| `production` | Pushing a `v*` tag, or running the workflow on one | `v1.2.3` (plus `sha-<commit>`) |

## How a deploy works

`.github/workflows/deploy.yml`:

1. Runs the CI gates (`ci.yml`).
2. Builds both images for amd64 and pushes them to GHCR.
3. Copies `deploy/compose.yaml` to the environment's directory on the server as `compose.yaml`.
4. Over SSH: sets `IMAGE_TAG` in the server's `.env`, then `docker compose pull` and `docker compose up -d --wait`. The run fails if a service doesn't become healthy within 5 minutes, and prints the service logs.
5. Removes this app's images that no container uses any more (skipping recent ones, so a deploy of the other environment running at the same time keeps its images).

Runs are serialized per environment and never cancelled halfway.

## Server requirements

- Linux on amd64 (the nginx base image is amd64-only), Docker Engine with the Compose plugin.
- An SSH user in the `docker` group. Each environment lives in its own directory (for example `~/settle-staging`); Compose names the project, and so its network and volumes, after that directory.
- A reverse proxy that reads `VIRTUAL_HOST`/`LETSENCRYPT_HOST` from containers and joins their networks, such as [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) with acme-companion. `web` publishes no port of its own.
- The proxy must reach `web` over a private network: the app trusts `X-Forwarded-*` headers from private addresses (`SYMFONY_TRUSTED_PROXIES=private_ranges`).

## Setting up an environment

Shown for `staging`; production is the same with its own directory, hostname, key and secrets.

### 1. Directory and `.env` on the server

```bash
mkdir -p ~/settle-staging && cd ~/settle-staging
cat > .env <<EOF
IMAGE_TAG=
APP_HOST=<public hostname>
APP_SECRET=$(openssl rand -hex 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 32)
MYSQL_DATABASE=settle
MYSQL_USER=settle
MYSQL_PASSWORD=$(openssl rand -hex 32)
EOF
chmod 600 .env
```

`deploy/.env.example` documents each value. The first deploy fills in `IMAGE_TAG` and brings `compose.yaml`.

### 2. Deploy key

On any machine, create a key used only by this environment's deploys:

```bash
ssh-keygen -t ed25519 -N '' -C settle-staging-deploy -f settle-staging-deploy
```

Append `settle-staging-deploy.pub` to the SSH user's `~/.ssh/authorized_keys` on the server. The private key goes into the GitHub secret below; delete the local copy afterwards.

### 3. GitHub Environment and secrets

Create the environment and its secrets (repository Settings → Environments, or `gh`):

```bash
gh api -X PUT repos/{owner}/{repo}/environments/staging
gh secret set SSH_HOST --env staging --body '<ssh host>'
gh secret set SSH_USER --env staging --body '<ssh user>'
gh secret set APP_PATH --env staging --body '/home/<ssh user>/settle-staging'
gh secret set SSH_KEY --env staging < settle-staging-deploy
gh secret set SSH_FINGERPRINT --env staging --body "$(ssh-keyscan -t ecdsa <ssh host> 2>/dev/null | ssh-keygen -lf - | awk '{print $2}')"
```

`SSH_FINGERPRINT` pins the server's host key; check it against `ssh-keygen -lf /etc/ssh/ssh_host_ecdsa_key.pub` on the server. The deploy actions prefer the ECDSA host key, then RSA, then Ed25519, so pin the first of those the server has.

Limit `production` to version tags, so no branch can deploy there:

```bash
gh api -X PUT repos/{owner}/{repo}/environments/production \
  -F 'deployment_branch_policy[protected_branches]=false' -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST repos/{owner}/{repo}/environments/production/deployment-branch-policies -f name='v*' -f type=tag
```

### 4. First deploy

Run the workflow (see [Deploying](#deploying)). The first build creates the `settle-php` and `settle-web` packages on GHCR, private by default. Make them public in each package's settings so the server can pull them without credentials; if the first run failed at `docker compose pull`, re-run its deploy job afterwards.

### 5. Connect the proxy

The first deploy creates the project network, `<directory>_default` (e.g. `settle-staging_default`). Connect the proxy to it without restarting the proxy:

```bash
docker network connect settle-staging_default <proxy container>
```

Also add the network to the proxy's own compose file as an external network, so the proxy rejoins it when it's recreated. acme-companion then issues the certificate; the site answers on `https://<APP_HOST>` once it has.

### 6. First user

```bash
docker compose exec php bin/console app:user:create <email> <password>
```

## Deploying

Staging, from any branch:

```bash
gh workflow run deploy.yml --ref <branch>
```

Production, by releasing a version:

```bash
gh release create v0.1.0 --generate-notes
```

## Rolling back

On the server, point `IMAGE_TAG` in `.env` at an earlier tag and restart:

```bash
cd ~/settle-staging && sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=v0.1.0/' .env && docker compose up -d --wait
```

Rolling back code does not roll back the database. Migrations run on every start of `php`, so they must stay backward-compatible: the previous release has to work against the newer schema. A failing migration keeps `php` restarting (and `web` waiting) until it is fixed or rolled back.

## Operations

All commands run in the environment's directory.

- Status and logs: `docker compose ps`, `docker compose logs -f php`
- Stop and start (e.g. staging between test sessions): `docker compose stop`, `docker compose start`
- Reset the staging database (after a branch's migrations left it out of step):

  ```bash
  docker compose stop && docker compose rm -f mariadb
  docker volume rm "$(basename "$PWD")_mariadb"
  docker compose up -d --wait
  ```

- MariaDB: the `ghcr.io/ame180/mariadb:12.3` tag follows patch releases, applied automatically on start (`MARIADB_AUTO_UPGRADE`). Moving to another release series means changing the tag in `deploy/compose.yaml`, `compose.yaml` and `.github/workflows/ci.yml`, plus `app.mysql_server_version` in `config/services.yaml`, ideally after a backup.
- Tearing an environment down: remove its network from the proxy's compose file first. While the network is listed there, recreating the proxy fails once the network is gone.

## Building locally

```bash
docker build -f docker/Dockerfile --target prod -t settle-php .
docker build -f docker/Dockerfile --target web -t settle-web .
```

On Apple Silicon, prefix with `DOCKER_DEFAULT_PLATFORM=linux/amd64`; the nginx base image is amd64-only.
