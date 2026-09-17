<?php

declare(strict_types=1);

namespace App\Dto;

readonly class TransferResponse
{
    public function __construct(
        public int $id,
        public int $payerId,
        public int $payeeId,
        public string $amount,
        public string $currency,
        public \DateTimeImmutable $occurredOn,
        public ?string $description,
    ) {
    }
}
