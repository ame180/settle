<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class SplitwiseImportRequest
{
    public const int MAX_CSV_BYTES = 1_048_576;

    /**
     * @param 0|1 $ownColumn which of the file's two person columns is the importing user
     */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: self::MAX_CSV_BYTES, countUnit: Assert\Length::COUNT_BYTES)]
        public string $csv,

        #[Assert\Choice([0, 1])]
        public int $ownColumn,
    ) {
    }
}
