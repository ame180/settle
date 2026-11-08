#!/bin/sh
set -e

: "${APP_SECRET:?APP_SECRET must be set}"

bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

exec "$@"
