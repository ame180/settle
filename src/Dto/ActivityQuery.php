<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class ActivityQuery extends PaginationQuery
{
    public function __construct(
        int $limit = 20,
        int $offset = 0,

        #[Assert\Positive]
        public ?int $contactId = null,
    ) {
        parent::__construct($limit, $offset);
    }
}
