<?php

declare(strict_types=1);

namespace App\Dto;

use App\Validator\Constraints\Decimal;
use Symfony\Component\Validator\Constraints as Assert;

readonly class CreateExpenseDebtRequest
{
    public function __construct(
        #[Assert\Positive]
        public int $payerId,

        #[Assert\Positive]
        #[Decimal(precision: 2)]
        public string $amount,
    ) {
    }
}
