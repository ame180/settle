<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\RecurringSeries;
use App\Enum\RepeatUnit;

readonly class RepeatResponse
{
    public function __construct(
        public RepeatUnit $unit,
        public int $every,
        public ?\DateTimeImmutable $nextOn,
        public bool $active,
    ) {
    }

    public static function fromSeries(RecurringSeries $series): self
    {
        return new self(
            unit: $series->getUnit(),
            every: $series->getEvery(),
            nextOn: $series->isActive() ? $series->getNextRunOn() : null,
            active: $series->isActive(),
        );
    }
}
