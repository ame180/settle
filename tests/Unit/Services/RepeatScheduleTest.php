<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Enum\RepeatUnit;
use App\Services\RepeatSchedule;
use PHPUnit\Framework\TestCase;

class RepeatScheduleTest extends TestCase
{
    /**
     * @return iterable<string, array{string, RepeatUnit, int, string, string}>
     */
    public static function cases(): iterable
    {
        yield 'monthly, past anchor' => ['2026-11-10', RepeatUnit::Month, 1, '2026-11-26', '2026-12-10'];
        yield 'monthly, strictly after a schedule date' => ['2026-10-26', RepeatUnit::Month, 1, '2026-11-26', '2026-12-26'];
        yield 'monthly, future anchor counts from itself' => ['2026-12-05', RepeatUnit::Month, 1, '2026-12-05', '2027-01-05'];
        yield 'monthly, 31st clamps to February' => ['2027-01-31', RepeatUnit::Month, 1, '2027-01-31', '2027-02-28'];
        yield 'monthly, 31st returns after a short month' => ['2027-01-31', RepeatUnit::Month, 1, '2027-02-28', '2027-03-31'];
        yield 'monthly, 31st clamps to 30-day month' => ['2027-03-31', RepeatUnit::Month, 1, '2027-03-31', '2027-04-30'];
        yield 'monthly, 31st in a leap February' => ['2028-01-31', RepeatUnit::Month, 1, '2028-01-31', '2028-02-29'];
        yield 'monthly, across a year end' => ['2026-12-15', RepeatUnit::Month, 1, '2026-12-15', '2027-01-15'];
        yield 'monthly, long gap' => ['2020-01-10', RepeatUnit::Month, 1, '2026-11-26', '2026-12-10'];
        yield 'yearly, 29 Feb clamps' => ['2028-02-29', RepeatUnit::Year, 1, '2028-02-29', '2029-02-28'];
        yield 'yearly, 29 Feb returns in a leap year' => ['2028-02-29', RepeatUnit::Year, 1, '2031-02-28', '2032-02-29'];
        yield 'weekly' => ['2026-11-20', RepeatUnit::Week, 1, '2026-11-26', '2026-11-27'];
        yield 'weekly, on a schedule date' => ['2026-11-20', RepeatUnit::Week, 1, '2026-11-27', '2026-12-04'];
        yield 'every 2 weeks' => ['2026-11-20', RepeatUnit::Week, 2, '2026-11-26', '2026-12-04'];
        yield 'every 2 weeks, long gap' => ['2026-01-02', RepeatUnit::Week, 2, '2026-11-26', '2026-12-04'];
        yield 'after is before the anchor' => ['2026-12-05', RepeatUnit::Month, 1, '2026-11-26', '2026-12-05'];
    }

    /**
     * @dataProvider cases
     */
    public function testFirstAfter(string $anchorOn, RepeatUnit $unit, int $every, string $after, string $expected): void
    {
        $next = (new RepeatSchedule())->firstAfter(new \DateTimeImmutable($anchorOn), $unit, $every, new \DateTimeImmutable($after));

        $this->assertSame($expected, $next->format('Y-m-d'));
    }

    /**
     * @return iterable<string, array{string, RepeatUnit, int, string, bool}>
     */
    public static function onScheduleCases(): iterable
    {
        yield 'the anchor itself' => ['2027-01-31', RepeatUnit::Month, 1, '2027-01-31', true];
        yield 'a clamped date' => ['2027-01-31', RepeatUnit::Month, 1, '2027-02-28', true];
        yield 'another day in a short month' => ['2027-01-31', RepeatUnit::Month, 1, '2027-02-27', false];
        yield 'before the anchor' => ['2027-01-31', RepeatUnit::Month, 1, '2026-12-31', false];
        yield 'every 2 weeks, off week' => ['2026-11-02', RepeatUnit::Week, 2, '2026-11-09', false];
        yield 'every 2 weeks, on week' => ['2026-11-02', RepeatUnit::Week, 2, '2026-11-16', true];
    }

    /**
     * @dataProvider onScheduleCases
     */
    public function testIsOnSchedule(string $anchorOn, RepeatUnit $unit, int $every, string $date, bool $expected): void
    {
        $this->assertSame($expected, (new RepeatSchedule())->isOnSchedule(new \DateTimeImmutable($anchorOn), $unit, $every, new \DateTimeImmutable($date)));
    }

    public function testUsesTheCalendarDateWhateverTheOffset(): void
    {
        $date = RepeatSchedule::toDate(new \DateTimeImmutable('2026-11-10T00:00:00+02:00'));

        $this->assertSame('2026-11-10', $date->format('Y-m-d'));
        $this->assertEquals(new \DateTimeImmutable('2026-11-10'), $date);
    }

    public function testIgnoresTimeOfDay(): void
    {
        $next = (new RepeatSchedule())->firstAfter(
            new \DateTimeImmutable('2026-11-10 18:00'),
            RepeatUnit::Month,
            1,
            new \DateTimeImmutable('2026-12-10 09:30'),
        );

        $this->assertSame('2027-01-10 00:00', $next->format('Y-m-d H:i'));
    }
}
