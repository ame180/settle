<?php

declare(strict_types=1);

namespace App\Dto;

readonly class SplitwiseImportPreview
{
    /**
     * @param array{string, string}                                 $names    the file's two people, in column order
     * @param ?string                                               $mismatch the file's PLN rows minus its PLN total, first person's side; null when they agree
     * @param array{SplitwiseImportSummary, SplitwiseImportSummary} $options  what importing would do if the user is the first or the second person
     */
    public function __construct(
        public array $names,
        public ?string $mismatch,
        public array $options,
    ) {
    }
}
