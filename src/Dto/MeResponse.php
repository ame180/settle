<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\User;

readonly class MeResponse
{
    public function __construct(
        public ?int $id,
        public string $email,
        public ?string $name,
    ) {
    }

    public static function fromUser(User $user): self
    {
        return new self(
            id: $user->getId(),
            email: $user->getEmail(),
            name: $user->getName(),
        );
    }
}
