<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class RegisterRequest
{
    public function __construct(
        #[Assert\NotBlank(normalizer: 'trim')]
        #[Assert\Email(normalizer: 'trim')]
        #[Assert\Length(max: 180, normalizer: 'trim')]
        public string $email,

        #[Assert\Length(min: 8, max: 64)]
        public string $password,

        #[Assert\Length(max: 64, normalizer: 'trim')]
        public ?string $name = null,
    ) {
    }
}
