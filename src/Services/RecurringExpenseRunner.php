<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\RecurringSeries;
use App\Repository\RecurringSeriesRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Clock\ClockInterface;
use Psr\Log\LoggerInterface;

/**
 * Creates every occurrence that is due, including ones missed while nothing ran.
 * Safe to run at any time and from several processes at once.
 */
class RecurringExpenseRunner
{
    public function __construct(
        private readonly ManagerRegistry $doctrine,
        private readonly RecurringSeriesRepository $seriesRepository,
        private readonly RepeatSchedule $schedule,
        private readonly ClockInterface $clock,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @return int the number of expenses created
     */
    public function run(): int
    {
        $today = RepeatSchedule::toDate($this->clock->now());
        $created = 0;

        foreach ($this->seriesRepository->findDueIds($today) as $seriesId) {
            try {
                $created += $this->runSeries($seriesId, $today);
            } catch (\Throwable $exception) {
                $this->logger->error('Recurring series {seriesId} failed; it will be retried on the next run.', [
                    'seriesId' => $seriesId,
                    'exception' => $exception,
                ]);
                $this->doctrine->resetManager();
            }
        }

        return $created;
    }

    private function runSeries(int $seriesId, \DateTimeImmutable $today): int
    {
        $entityManager = $this->entityManager();
        $entityManager->clear();

        return $entityManager->wrapInTransaction(function (EntityManagerInterface $entityManager) use ($seriesId, $today): int {
            $series = $entityManager->find(RecurringSeries::class, $seriesId, LockMode::PESSIMISTIC_WRITE);
            if (null === $series || !$series->isActive() || $series->getNextRunOn() > $today) {
                return 0;
            }

            $latest = $entityManager->getRepository(Expense::class)->findOneBy(['series' => $series], ['id' => 'DESC']);
            if (null === $latest) {
                $this->logger->warning('Recurring series {seriesId} has no expenses to copy.', ['seriesId' => $seriesId]);

                return 0;
            }

            $created = 0;
            while ($series->getNextRunOn() <= $today) {
                $latest = $this->copy($entityManager, $latest, $series->getNextRunOn());
                ++$created;

                $series->advanceTo($this->schedule->firstAfter($series->getAnchorOn(), $series->getUnit(), $series->getEvery(), $series->getNextRunOn()));
            }

            return $created;
        });
    }

    /**
     * Copies everything but comments. Same amount and split values, so the split comes out the same.
     */
    private function copy(EntityManagerInterface $entityManager, Expense $latest, \DateTimeImmutable $occurredOn): Expense
    {
        $copy = new Expense(
            $latest->getPayee(),
            $latest->getTitle(),
            $latest->getDescription(),
            $latest->getAmount(),
            $occurredOn,
            $latest->getCurrency(),
            $latest->getSplitType(),
            $latest->getCategory(),
        );
        $copy->setSeries($latest->getSeries());
        $entityManager->persist($copy);

        foreach ($latest->getDebts() as $debt) {
            $debtCopy = new Debt($debt->getPayer(), $copy, $debt->getAmount(), $copy->getCurrency(), $debt->getSplitValue());
            $copy->addDebt($debtCopy);
            $entityManager->persist($debtCopy);
        }

        return $copy;
    }

    private function entityManager(): EntityManagerInterface
    {
        $entityManager = $this->doctrine->getManagerForClass(RecurringSeries::class);
        if (!$entityManager instanceof EntityManagerInterface) {
            throw new \LogicException('No entity manager handles RecurringSeries.');
        }

        return $entityManager;
    }
}
