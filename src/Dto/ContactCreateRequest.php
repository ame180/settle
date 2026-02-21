<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class ContactCreateRequest
{
    public function __construct(
        #[Assert\NotBlank(normalizer: 'trim')]
        #[Assert\Email(normalizer: 'trim')]
        public string $email,
    ) {
    }
}
