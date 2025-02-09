#!/bin/bash

composer install

bin/console doctrine:migrations:migrate --no-interaction

php-fpm
