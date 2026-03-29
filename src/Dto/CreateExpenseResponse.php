<?php

declare(strict_types=1);

namespace App\Dto;

readonly class CreateExpenseResponse
{
    public function __construct(
        public int $id,
        public string $title,
        public ?string $description,
        public string $amount,
        public int $payeeId,
        public \DateTimeImmutable $occurredOn,
    ) {
    }
}
