<?php

declare(strict_types=1);

namespace App\Dto;

readonly class SplitwiseImportSummary
{
    public function __construct(
        public int $expenses,
        public int $transfers,
        public int $skipped,
        /** The pair's PLN balance after the import, from the importing user's side: positive = the contact owes them. */
        public string $balance,
    ) {
    }
}
