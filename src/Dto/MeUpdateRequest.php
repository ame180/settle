<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class MeUpdateRequest
{
    public function __construct(
        #[Assert\NotNull(message: 'Send an empty string to clear the name.')]
        #[Assert\Length(max: 64, normalizer: 'trim')]
        public ?string $name = null,
    ) {
    }
}
