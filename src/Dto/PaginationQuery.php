<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class PaginationQuery
{
    public function __construct(
        #[Assert\Positive]
        #[Assert\LessThanOrEqual(100)]
        public int $limit = 20,

        #[Assert\PositiveOrZero]
        public int $offset = 0,
    ) {
    }
}
