FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# nginx-php hardcodes `fastcgi_pass php:9000`, so the app service must be reachable as `php`.
FROM ghcr.io/ame180/nginx-php:latest AS web

ENV APP_PATH=/app

COPY public /app/public
COPY --from=frontend-build /app/public/app /app/public/app


FROM php:8.4-fpm AS base

# Install composer
COPY --from=composer:2.11 /usr/bin/composer /usr/bin/composer

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql bcmath

# Install dependencies
RUN apt-get update && apt-get -y install git unzip && apt-get clean

RUN git config --global --add safe.directory /app

WORKDIR /app


# Last stage, so a build without --target produces the app image.
FROM base AS prod

ENV APP_ENV=prod

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php/prod.ini "$PHP_INI_DIR/conf.d/zz-prod.ini"

COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --optimize-autoloader

COPY . .
COPY --from=frontend-build /app/public/app ./public/app

RUN composer dump-autoload --no-dev --optimize --classmap-authoritative \
    && composer dump-env prod --empty \
    && mkdir -p var/sessions \
    && chown -R www-data:www-data var

# FPM workers run as www-data, so the cache must be built as www-data to stay writable at runtime.
USER www-data

# Placeholder values only satisfy container compilation; real values come from the runtime environment.
RUN APP_SECRET=build MYSQL_DATABASE=settle MYSQL_HOST=mysql MYSQL_PORT=3306 MYSQL_USER=settle MYSQL_PASSWORD=settle \
    MESSENGER_TRANSPORT_DSN=doctrine://default MAILER_DSN=null://null \
    bin/console cache:warmup

ENTRYPOINT ["docker/entrypoint.prod.sh"]
CMD ["php-fpm"]
