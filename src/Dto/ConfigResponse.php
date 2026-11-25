<?php

declare(strict_types=1);

namespace App\Dto;

readonly class ConfigResponse
{
    public function __construct(
        public bool $registrationEnabled,
    ) {
    }
}
