<?php

declare(strict_types=1);

namespace App\Dto;

readonly class ContactListItem
{
    /**
     * @param list<CurrencyAmount> $balances
     */
    public function __construct(
        public PersonRef $person,
        public ?string $nickname,
        public ?string $name,
        public bool $isRegistered,
        public array $balances,
        public \DateTimeImmutable $lastActivityAt,
    ) {
    }
}
