<?php

declare(strict_types=1);

namespace App\Services\Splitwise;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Reads a Splitwise friend export ("Export as spreadsheet" on a friend). Splitwise translates
 * its labels, so the file is read by position: a note line, a blank line, a 7-column header
 * ending in the two people's names, a blank line, the expense rows, a blank line, then one Total
 * balance row per currency (with empty Category and Cost).
 */
class SplitwiseCsvParser
{
    /** Splitwise writes 2 decimals; a little headroom keeps sums exact for 3-decimal currencies. */
    public const int SCALE = 3;

    private const int COLUMNS = 7;
    private const string DECIMAL = '/^-?\d+(\.\d{1,3})?$/';

    public function parse(string $csv): SplitwiseExport
    {
        $lines = $this->readLines($csv);

        if (count($lines) < 4 || !$this->isNote($lines[0]) || !$this->isBlank($lines[1]) || self::COLUMNS !== count($lines[2]) || !$this->isBlank($lines[3])) {
            throw $this->notAnExport();
        }

        $names = [trim((string) $lines[2][5]), trim((string) $lines[2][6])];
        if ('' === $names[0] || '' === $names[1]) {
            throw $this->notAnExport();
        }

        $index = 4;
        $rows = [];
        while ($index < count($lines) && !$this->isBlank($lines[$index]) && !$this->isTotal($lines[$index])) {
            $rows[] = $this->parseRow($lines[$index]);
            ++$index;
        }

        $totals = [];
        for (; $index < count($lines); ++$index) {
            $line = $lines[$index];
            if ($this->isBlank($line)) {
                continue;
            }

            [$currency, $net] = $this->parseTotal($line);
            if (isset($totals[$currency])) {
                throw $this->notAnExport();
            }

            $totals[$currency] = $net;
        }

        return new SplitwiseExport($names, $rows, $totals);
    }

    /**
     * @return list<list<?string>>
     */
    private function readLines(string $csv): array
    {
        $stream = fopen('php://memory', 'r+');
        if (false === $stream) {
            throw new \RuntimeException('Could not open a memory stream.');
        }

        fwrite($stream, preg_replace('/^\xEF\xBB\xBF/', '', $csv) ?? $csv);
        rewind($stream);

        $lines = [];
        while (false !== ($line = fgetcsv($stream, escape: ''))) {
            $lines[] = $line;
        }

        fclose($stream);

        return $lines;
    }

    /**
     * @param list<?string> $line
     */
    private function parseRow(array $line): SplitwiseRow
    {
        if (self::COLUMNS !== count($line)) {
            throw $this->notAnExport();
        }

        [$date, $description, $category, $cost, $currency, $netA, $netB] = array_map(static fn (?string $cell): string => trim((string) $cell), $line);

        $parsedDate = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (false === $parsedDate || $parsedDate->format('Y-m-d') !== $date) {
            throw $this->notAnExport();
        }

        if (1 !== preg_match('/^[A-Z]{3}$/', $currency) || !$this->isDecimal($cost) || !$this->isDecimal($netA) || !$this->isDecimal($netB)) {
            throw $this->notAnExport();
        }

        $absoluteNet = ltrim($netA, '-');
        if (0 !== bccomp(bcadd($netA, $netB, self::SCALE), '0', self::SCALE)
            || bccomp($cost, '0', self::SCALE) < 0
            || bccomp($absoluteNet, $cost, self::SCALE) > 0) {
            throw $this->notAnExport();
        }

        return new SplitwiseRow($parsedDate, $description, $category, $cost, $currency, [$netA, $netB]);
    }

    /**
     * @param list<?string> $line
     *
     * @return array{string, string}
     */
    private function parseTotal(array $line): array
    {
        if (self::COLUMNS !== count($line)) {
            throw $this->notAnExport();
        }

        $cells = array_map(static fn (?string $cell): string => trim((string) $cell), $line);
        if (!$this->isTotal($line) || 1 !== preg_match('/^[A-Z]{3}$/', $cells[4]) || !$this->isDecimal($cells[5])) {
            throw $this->notAnExport();
        }

        return [$cells[4], $cells[5]];
    }

    /**
     * @param list<?string> $line
     */
    private function isTotal(array $line): bool
    {
        return self::COLUMNS === count($line) && '' === trim((string) $line[2]) && '' === trim((string) $line[3]);
    }

    /**
     * @param list<?string> $line
     */
    private function isBlank(array $line): bool
    {
        return 1 === count($line) && '' === trim((string) $line[0]);
    }

    /**
     * @param list<?string> $line
     */
    private function isNote(array $line): bool
    {
        return 1 === count($line) && '' !== trim((string) $line[0]);
    }

    private function isDecimal(string $value): bool
    {
        return 1 === preg_match(self::DECIMAL, $value);
    }

    private function notAnExport(): UnprocessableEntityHttpException
    {
        return new UnprocessableEntityHttpException('The file is not a Splitwise friend export.');
    }
}
