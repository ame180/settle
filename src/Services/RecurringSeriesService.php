<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\RepeatRequest;
use App\Entity\Expense;
use App\Entity\RecurringSeries;
use App\Repository\ExpenseRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Applies the repeat chosen in the expense form. Only a series' latest expense controls it.
 */
class RecurringSeriesService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ExpenseRepository $expenseRepository,
        private readonly RepeatSchedule $schedule,
        private readonly ClockInterface $clock,
    ) {
    }

    /**
     * Rejects a repeat on an older member of a series, before the caller changes anything.
     */
    public function assertCanSetRepeat(Expense $expense, ?RepeatRequest $repeat): void
    {
        if (null === $repeat || null === $expense->getSeries() || $this->isLatest($expense)) {
            return;
        }

        throw new UnprocessableEntityHttpException('Only the latest expense in a repeat can change it.');
    }

    public function applyOnCreate(Expense $expense, ?RepeatRequest $repeat): void
    {
        if (null === $repeat) {
            return;
        }

        $anchorOn = RepeatSchedule::toDate($expense->getOccurredOn());
        $series = new RecurringSeries($repeat->unit, $repeat->every, $anchorOn, $this->nextRunOn($anchorOn, $repeat, $expense));
        $this->entityManager->persist($series);
        $expense->setSeries($series);
    }

    /**
     * Call with the expense already updated; `$previousOccurredOn` is its date before the edit.
     * The schedule keeps its anchor while the latest's date is one of its dates, so a clamped
     * 28 Feb still returns to the 31st.
     */
    public function applyOnUpdate(Expense $expense, ?RepeatRequest $repeat, \DateTimeImmutable $previousOccurredOn): void
    {
        $series = $expense->getSeries();
        if (null === $series) {
            $this->applyOnCreate($expense, $repeat);

            return;
        }

        if (!$this->isLatest($expense)) {
            return;
        }

        if (null === $repeat) {
            $series->stop();

            return;
        }

        $keepsAnchor = $series->hasFrequency($repeat->unit, $repeat->every)
            && $this->schedule->isOnSchedule($series->getAnchorOn(), $repeat->unit, $repeat->every, $expense->getOccurredOn());
        $dateChanged = $previousOccurredOn->format('Y-m-d') !== $expense->getOccurredOn()->format('Y-m-d');
        if ($keepsAnchor && !$dateChanged && $series->isActive()) {
            return;
        }

        $anchorOn = $keepsAnchor ? $series->getAnchorOn() : RepeatSchedule::toDate($expense->getOccurredOn());
        $series->reschedule($repeat->unit, $repeat->every, $anchorOn, $this->nextRunOn($anchorOn, $repeat, $expense));
    }

    /**
     * Call before removing the expense. Deleting the latest stops the series; the one before becomes its latest.
     */
    public function applyOnDelete(Expense $expense): void
    {
        $series = $expense->getSeries();
        if (null === $series || !$this->isLatest($expense)) {
            return;
        }

        if ($this->isOnlyMember($expense)) {
            $this->entityManager->remove($series);

            return;
        }

        $series->stop();
    }

    private function isLatest(Expense $expense): bool
    {
        $series = $expense->getSeries();

        return null !== $series && $this->expenseRepository->findLatestIdInSeries($series) === $expense->getId();
    }

    private function isOnlyMember(Expense $expense): bool
    {
        return 1 === $this->expenseRepository->count(['series' => $expense->getSeries()]);
    }

    /**
     * No backfill: a past date starts from the first schedule date after today.
     */
    private function nextRunOn(\DateTimeImmutable $anchorOn, RepeatRequest $repeat, Expense $latest): \DateTimeImmutable
    {
        $today = RepeatSchedule::toDate($this->clock->now());
        $latestOn = RepeatSchedule::toDate($latest->getOccurredOn());

        return $this->schedule->firstAfter($anchorOn, $repeat->unit, $repeat->every, max($latestOn, $today));
    }
}
