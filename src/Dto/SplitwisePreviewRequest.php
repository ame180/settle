<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class SplitwisePreviewRequest
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: SplitwiseImportRequest::MAX_CSV_BYTES, countUnit: Assert\Length::COUNT_BYTES)]
        public string $csv,
    ) {
    }
}
