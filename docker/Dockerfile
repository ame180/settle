FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


FROM php:8.4-fpm AS base

# Install composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql bcmath

# Install dependencies
RUN apt-get update && apt-get -y install git unzip && apt-get clean

RUN git config --global --add safe.directory /app

WORKDIR /app


FROM base AS prod

ENV APP_ENV=prod

COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --optimize-autoloader

COPY . .
COPY --from=frontend-build /app/public/app ./public/app

# Placeholder values only satisfy container compilation; real values come from the runtime environment.
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative \
    && composer dump-env prod --empty \
    && APP_SECRET=build MYSQL_DATABASE=settle MYSQL_HOST=mysql MYSQL_PORT=3306 MYSQL_USER=settle MYSQL_PASSWORD=settle \
       MESSENGER_TRANSPORT_DSN=doctrine://default MAILER_DSN=null://null \
       bin/console cache:warmup

CMD ["php-fpm"]
