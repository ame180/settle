<?php

declare(strict_types=1);

namespace App\Services;

use App\Enum\RepeatUnit;

/**
 * Schedule dates are the anchor plus whole steps. Monthly and yearly steps keep the anchor's
 * day of the month, clamped to shorter months, so 31 Jan gives 28 Feb and then 31 Mar.
 */
class RepeatSchedule
{
    public function firstAfter(\DateTimeImmutable $anchorOn, RepeatUnit $unit, int $every, \DateTimeImmutable $after): \DateTimeImmutable
    {
        $anchorOn = self::toDate($anchorOn);
        $after = self::toDate($after);

        if ($after < $anchorOn) {
            return $anchorOn;
        }

        $step = $this->estimateStepsBefore($anchorOn, $unit, $every, $after);
        while (($date = $this->occurrence($anchorOn, $unit, $every, $step)) <= $after) {
            ++$step;
        }

        return $date;
    }

    public function isOnSchedule(\DateTimeImmutable $anchorOn, RepeatUnit $unit, int $every, \DateTimeImmutable $date): bool
    {
        $date = self::toDate($date);

        return $this->firstAfter($anchorOn, $unit, $every, $date->modify('-1 day')) == $date;
    }

    /**
     * The value's own calendar date, at midnight in the default timezone.
     */
    public static function toDate(\DateTimeImmutable $dateTime): \DateTimeImmutable
    {
        return new \DateTimeImmutable($dateTime->format('Y-m-d'));
    }

    private function occurrence(\DateTimeImmutable $anchorOn, RepeatUnit $unit, int $every, int $step): \DateTimeImmutable
    {
        if (RepeatUnit::Week === $unit) {
            return $anchorOn->modify(sprintf('+%d days', 7 * $every * $step));
        }

        $monthIndex = $this->monthIndex($anchorOn) + $step * $this->monthsPerStep($unit, $every);
        $year = intdiv($monthIndex, 12);
        $month = $monthIndex % 12 + 1;
        $daysInMonth = (int) $anchorOn->setDate($year, $month, 1)->format('t');

        return $anchorOn->setDate($year, $month, min((int) $anchorOn->format('j'), $daysInMonth));
    }

    /**
     * A lower bound on the step count, so long gaps don't walk the schedule one step at a time.
     */
    private function estimateStepsBefore(\DateTimeImmutable $anchorOn, RepeatUnit $unit, int $every, \DateTimeImmutable $after): int
    {
        if (RepeatUnit::Week === $unit) {
            return intdiv((int) $anchorOn->diff($after)->days, 7 * $every);
        }

        return intdiv($this->monthIndex($after) - $this->monthIndex($anchorOn), $this->monthsPerStep($unit, $every));
    }

    private function monthIndex(\DateTimeImmutable $date): int
    {
        return (int) $date->format('Y') * 12 + (int) $date->format('n') - 1;
    }

    private function monthsPerStep(RepeatUnit $unit, int $every): int
    {
        return RepeatUnit::Year === $unit ? 12 * $every : $every;
    }
}
