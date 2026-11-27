<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\RecurringSeries;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RecurringSeries>
 */
class RecurringSeriesRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RecurringSeries::class);
    }

    /**
     * @return list<int>
     */
    public function findDueIds(\DateTimeImmutable $today): array
    {
        /** @var list<array{id: int|string}> $rows */
        $rows = $this->createQueryBuilder('s')
            ->select('s.id')
            ->where('s.active = true')
            ->andWhere('s.nextRunOn <= :today')
            ->setParameter('today', $today->format('Y-m-d'))
            ->orderBy('s.id')
            ->getQuery()
            ->getArrayResult();

        return array_map(static fn (array $row): int => (int) $row['id'], $rows);
    }
}
