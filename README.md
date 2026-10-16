# Settle

Expense sharing for ad-hoc groups of friends. Symfony 7.4 JSON API plus a React single-page app.

## Development

1. Copy `.env.example` to `.env` and fill in the values.
2. `docker login ghcr.io -u <username> -p <token>` (nginx/mariadb images live there).
3. `docker compose up -d` starts PHP, nginx (port `NGINX_PORT`, default 80) and the database. The PHP container installs Composer dependencies and runs migrations on start.
4. Create a user: `docker compose exec php bin/console app:user:create <email> <password>`.
5. Frontend: `cd frontend && npm install && npm run dev`, then open http://localhost:5173. The Vite dev server proxies `/api` to nginx (override with `VITE_API_PROXY`).

Quality gates, run locally (not in the container): `composer checkup`, `composer test` (needs the database container up), and in `frontend/`: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npx vitest run`, `npm run build`.

## Production image

```bash
docker build -f docker/Dockerfile --target prod -t settle .
```

The image contains PHP-FPM, vendor dependencies and the built frontend under `public/app`. Serve `public/` with nginx in front of it and run `bin/console doctrine:migrations:migrate` as a release step.
