<?php

declare(strict_types=1);

namespace App\Dto;

use App\Validator\Constraints\Decimal;
use Symfony\Component\Validator\Constraints as Assert;

readonly class TransferUpdateRequest
{
    public function __construct(
        #[Assert\Positive]
        #[Decimal(scale: 2)]
        public string $amount,

        public \DateTimeImmutable $occurredOn,

        public ?string $description = null,
    ) {
    }
}
