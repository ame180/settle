<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

readonly class SplitwiseImportRequest
{
    /**
     * @param 0|1|null $ownColumn which of the file's two person columns is the importing user; required unless dry run
     */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 1_048_576, countUnit: Assert\Length::COUNT_BYTES)]
        public string $csv,

        #[Assert\Choice([0, 1])]
        public ?int $ownColumn = null,
    ) {
    }
}
