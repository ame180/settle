<?php

declare(strict_types=1);

namespace App\Dto;

readonly class ContactResponse
{
    public function __construct(
        public ?int $id,
        public string $email,
        public bool $isRegistered,
    ) {
    }
}
