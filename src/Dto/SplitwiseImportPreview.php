<?php

declare(strict_types=1);

namespace App\Dto;

readonly class SplitwiseImportPreview
{
    /**
     * @param array{string, string}                                 $names    the file's two people, in column order
     * @param ?string                                               $mismatch how far the file's PLN rows are off its own PLN total; null when they agree
     * @param array{SplitwiseImportSummary, SplitwiseImportSummary} $options  what importing would do if the user is the first or the second person
     */
    public function __construct(
        public array $names,
        public ?string $mismatch,
        public array $options,
    ) {
    }
}
