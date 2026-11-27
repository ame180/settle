<?php

declare(strict_types=1);

namespace App\Dto;

readonly class SplitwiseImportPreview
{
    /**
     * @param array{string, string}                                 $names      the file's two people, in column order
     * @param list<CurrencyAmount>                                  $mismatches per currency, the file's rows minus its Total balance (first person's side)
     * @param array{SplitwiseImportSummary, SplitwiseImportSummary} $options    what importing would do if the user is the first or the second person
     */
    public function __construct(
        public array $names,
        public array $mismatches,
        public array $options,
    ) {
    }
}
