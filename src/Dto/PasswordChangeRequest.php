<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class PasswordChangeRequest
{
    public function __construct(
        #[Assert\NotBlank]
        public string $currentPassword,

        #[Assert\Length(min: 8, max: 64)]
        public string $newPassword,
    ) {
    }
}
