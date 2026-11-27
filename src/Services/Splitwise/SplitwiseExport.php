<?php

declare(strict_types=1);

namespace App\Services\Splitwise;

readonly class SplitwiseExport
{
    /**
     * @param array{string, string}                $names            the two person columns, in file order
     * @param list<SplitwiseRow>                   $rows
     * @param array<string, array{string, string}> $totalsByCurrency the Total balance per currency, per person column
     */
    public function __construct(
        public array $names,
        public array $rows,
        public array $totalsByCurrency,
    ) {
    }
}
