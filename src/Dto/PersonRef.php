<?php

declare(strict_types=1);

namespace App\Dto;

readonly class PersonRef
{
    public function __construct(
        public int $id,
        public string $displayName,
        public string $email,
    ) {
    }
}
