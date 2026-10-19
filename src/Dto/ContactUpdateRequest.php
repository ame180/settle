<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class ContactUpdateRequest
{
    public function __construct(
        #[Assert\Length(max: 64, normalizer: 'trim')]
        public ?string $nickname = null,
    ) {
    }
}
