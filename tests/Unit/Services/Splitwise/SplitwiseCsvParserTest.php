<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services\Splitwise;

use App\Services\Splitwise\SplitwiseCsvParser;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class SplitwiseCsvParserTest extends TestCase
{
    private const string HEADER = "Note: does not include group expenses\n\nDate,Description,Category,Cost,Currency,Anna Kowalska,Ben Nowak\n\n";

    /**
     * @dataProvider languageProvider
     */
    public function testParsesExportByPosition(string $file, string $paymentCategory): void
    {
        $export = (new SplitwiseCsvParser())->parse(self::fixture($file));

        $this->assertSame(['Anna Kowalska', 'Ben Nowak'], $export->names);
        $this->assertCount(7, $export->rows);
        $this->assertSame(['PLN' => ['122.20', '-122.20'], 'EUR' => ['15.00', '-15.00']], $export->totalsByCurrency);

        $taxi = $export->rows[1];
        $this->assertSame('2025-01-11', $taxi->date->format('Y-m-d'));
        $this->assertSame('Taxi, airport', $taxi->description);
        $this->assertSame('80.00', $taxi->cost);
        $this->assertSame(['-80.00', '80.00'], $taxi->nets);
        $this->assertSame($paymentCategory, $export->rows[2]->category);
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function languageProvider(): iterable
    {
        yield 'English' => ['en.csv', 'Payment'];
        yield 'Polish' => ['pl.csv', 'Płatność'];
    }

    public function testStripsByteOrderMark(): void
    {
        $export = (new SplitwiseCsvParser())->parse("\xEF\xBB\xBF".self::fixture('en.csv'));

        $this->assertSame(['Anna Kowalska', 'Ben Nowak'], $export->names);
    }

    public function testAcceptsExportWithoutRows(): void
    {
        $export = (new SplitwiseCsvParser())->parse(self::HEADER."2025-02-01,Total balance, , ,PLN,0.00,0.00\n");

        $this->assertSame([], $export->rows);
    }

    /**
     * @dataProvider invalidProvider
     */
    public function testRejectsFilesOfAnotherShape(string $csv): void
    {
        $this->expectException(UnprocessableEntityHttpException::class);

        (new SplitwiseCsvParser())->parse($csv);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function invalidProvider(): iterable
    {
        $total = "\n2025-02-01,Total balance, , ,PLN,10.00,-10.00\n";

        yield 'empty' => [''];
        yield 'plain table' => ["Date,Description,Amount\n2025-01-10,Lunch,10.00\n"];
        yield 'group export with three people' => ["Note: does not include group expenses\n\nDate,Description,Category,Cost,Currency,Anna,Ben,Cleo\n"];
        yield 'blank name' => ["Note\n\nDate,Description,Category,Cost,Currency,Anna, \n\n"];
        yield 'bad date' => [self::HEADER.'10.01.2025,Lunch,General,10.00,PLN,10.00,-10.00'.$total];
        yield 'comma decimal' => [self::HEADER.'2025-01-10,Lunch,General,"10,00",PLN,10.00,-10.00'.$total];
        yield 'total without a currency' => [self::HEADER."2025-01-10,Lunch,General,10.00,PLN,10.00,-10.00\n\n2025-02-01,Total balance, , , ,10.00,-10.00\n"];
        yield 'short row' => [self::HEADER.'2025-01-10,Lunch,General,10.00,PLN'.$total];
        yield 'trailing junk' => [self::HEADER.'2025-01-10,Lunch,General,10.00,PLN,10.00,-10.00'.$total."something else\n"];
        yield 'duplicate total' => [self::HEADER.'2025-01-10,Lunch,General,10.00,PLN,10.00,-10.00'.$total."2025-02-01,Total balance, , ,PLN,10.00,-10.00\n"];
    }

    private static function fixture(string $file): string
    {
        return (string) file_get_contents(__DIR__.'/../../../Support/fixtures/splitwise/'.$file);
    }
}
