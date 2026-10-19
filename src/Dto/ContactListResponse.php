<?php

declare(strict_types=1);

namespace App\Dto;

readonly class ContactListResponse
{
    /**
     * @param list<CurrencyAmount>  $totals
     * @param list<ContactListItem> $items
     */
    public function __construct(
        public array $totals,
        public array $items,
    ) {
    }
}
