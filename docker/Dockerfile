FROM php:8.4-fpm AS base

# Install composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql bcmath

# Install dependencies
RUN apt-get update && apt-get -y install git unzip && apt-get clean

RUN git config --global --add safe.directory /app

WORKDIR /app