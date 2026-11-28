<?php

declare(strict_types=1);

namespace App\Services\Splitwise;

readonly class SplitwiseRow
{
    /**
     * @param array{string, string} $nets balance effect per person column, positive = owed
     */
    public function __construct(
        public \DateTimeImmutable $date,
        public string $description,
        public string $category,
        public string $cost,
        public string $currency,
        public array $nets,
    ) {
    }
}
