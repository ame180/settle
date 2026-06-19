<?php

declare(strict_types=1);

namespace App\Dto;

readonly class ExpenseResponse
{
    public function __construct(
        public int $id,
        public string $title,
        public ?string $description,
        public string $amount,
        public string $currency,
        public int $payeeId,
        public \DateTimeImmutable $occurredOn,
    ) {
    }
}
