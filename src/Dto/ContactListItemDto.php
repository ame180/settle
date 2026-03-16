<?php

declare(strict_types=1);

namespace App\Dto;

readonly class ContactListItemDto
{
    public function __construct(
        public ?int $id,
        public string $email,
    ) {
    }
}
