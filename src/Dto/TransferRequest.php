<?php

declare(strict_types=1);

namespace App\Dto;

use App\Validator\Constraints\Decimal;
use Symfony\Component\Validator\Constraints as Assert;

readonly class TransferRequest
{
    public function __construct(
        #[Assert\Positive]
        public int $payerId,

        #[Assert\Positive]
        public int $payeeId,

        #[Assert\Positive]
        #[Decimal(scale: 2)]
        public string $amount,

        public \DateTimeImmutable $occurredOn,

        public ?string $description = null,
    ) {
    }
}
