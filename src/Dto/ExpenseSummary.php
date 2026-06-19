<?php

declare(strict_types=1);

namespace App\Dto;

readonly class ExpenseSummary
{
    public function __construct(
        public int $id,
        public string $title,
        public ?string $description,
        public string $payeeEmail,
        public string $value,
        public \DateTimeImmutable $occurredOn,
    ) {
    }
}
