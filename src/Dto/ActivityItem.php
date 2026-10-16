<?php

declare(strict_types=1);

namespace App\Dto;

use App\Enum\ActivityType;

readonly class ActivityItem
{
    public function __construct(
        public ActivityType $type,
        public int $id,
        public \DateTimeImmutable $occurredOn,
        public string $currency,
        public string $amount,
        public string $value,
        public ?string $title,
        public ?string $description,
        public int $payeeId,
        public string $payeeEmail,
        public ?int $payerId,
        public ?string $payerEmail,
    ) {
    }
}
