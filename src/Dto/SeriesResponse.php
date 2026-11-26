<?php

declare(strict_types=1);

namespace App\Dto;

readonly class SeriesResponse
{
    public function __construct(
        public int $latestId,
        public bool $isLatest,
    ) {
    }
}
