# Settle

Expense sharing for ad-hoc groups of friends. Symfony 7.4 JSON API plus a React single-page app.

## Development

1. Copy `.env.example` to `.env` and fill in the values.
2. `docker login ghcr.io -u <username> -p <token>` (nginx/mariadb images live there).
3. `docker compose up -d` starts PHP, nginx (port `NGINX_PORT`, default 80) and the database. The PHP container installs Composer dependencies and runs migrations on start.
4. Create a user: `docker compose exec php bin/console app:user:create <email> <password>`.
5. Frontend: `cd frontend && npm install && npm run dev`, then open http://localhost:5173. The Vite dev server proxies `/api` to nginx (override with `VITE_API_PROXY`).

Quality gates, run locally (not in the container): `composer checkup`, `composer test` (needs the database container up), and in `frontend/`: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npx vitest run`, `npm run build`.

## Production

`docker/Dockerfile` has two production targets (`prod` is the default when no `--target` is given):

- `prod`: PHP-FPM with vendor dependencies, the built frontend under `public/app` and a warmed cache. It runs as `www-data` and applies migrations on every start, so a failing migration keeps the container restarting until it is fixed or rolled back.
- `web`: nginx serving `public/` and passing PHP requests to the `php` service.

`compose.prod.yaml` runs both with MariaDB behind [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) and acme-companion:

```bash
cp .env.prod.example .env   # fill in secrets and VIRTUAL_HOST
docker compose -f compose.prod.yaml up -d
```

The `web` service joins the external proxy network (`PROXY_NETWORK`). Give each stack on a host its own `COMPOSE_PROJECT_NAME`. The images are amd64-only because the nginx base image is; on Apple Silicon build them with `DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f compose.prod.yaml build`.
