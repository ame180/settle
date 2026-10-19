<?php

declare(strict_types=1);

namespace App\Dto;

readonly class CurrencyAmount
{
    public function __construct(
        public string $currency,
        public string $amount,
    ) {
    }
}
