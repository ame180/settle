<?php

declare(strict_types=1);

namespace App\Services\Splitwise;

use App\Dto\CurrencyAmount;

readonly class SplitwiseExport
{
    /**
     * @param array{string, string} $names            the two person columns, in file order
     * @param list<SplitwiseRow>    $rows
     * @param array<string, string> $totalsByCurrency the first person's Total balance per currency
     */
    public function __construct(
        public array $names,
        public array $rows,
        public array $totalsByCurrency,
    ) {
    }

    /**
     * Currencies whose rows don't add up to the file's own Total balance, with the difference
     * (rows minus total) from the first person's side.
     *
     * @return list<CurrencyAmount>
     */
    public function totalMismatches(): array
    {
        $sums = array_fill_keys(array_keys($this->totalsByCurrency), '0');
        foreach ($this->rows as $row) {
            $sums[$row->currency] = bcadd($sums[$row->currency] ?? '0', $row->nets[0], SplitwiseCsvParser::SCALE);
        }

        ksort($sums);

        $mismatches = [];
        foreach ($sums as $currency => $sum) {
            $difference = bcsub($sum, $this->totalsByCurrency[$currency] ?? '0', SplitwiseCsvParser::SCALE);
            if (0 !== bccomp($difference, '0', SplitwiseCsvParser::SCALE)) {
                $mismatches[] = new CurrencyAmount((string) $currency, bcadd($difference, '0', 2));
            }
        }

        return $mismatches;
    }
}
