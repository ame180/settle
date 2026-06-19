<?php

declare(strict_types=1);

namespace App\Dto;

readonly class ExpenseDebtResponse
{
    public function __construct(
        public int $payerId,
        public string $amount,
        public ?string $splitValue,
    ) {
    }
}
