<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Transfer;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Transfer>
 */
class TransferRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Transfer::class);
    }

    /**
     * @param list<int> $ids
     *
     * @return list<Transfer>
     */
    public function findByIdsWithParties(array $ids): array
    {
        if ([] === $ids) {
            return [];
        }

        return $this->createQueryBuilder('t')
            ->leftJoin('t.payer', 'payer')
            ->addSelect('payer')
            ->leftJoin('t.payee', 'payee')
            ->addSelect('payee')
            ->where('t.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();
    }

    /**
     * Latest transfer creation time per counterpart, in either direction.
     *
     * @return array<int, \DateTimeImmutable> keyed by counterpart user id
     */
    public function findLastCreatedAtByCounterpart(User $user): array
    {
        /** @var list<array{counterpartId: int|string, lastCreatedAt: string}> $rows */
        $rows = $this->createQueryBuilder('t')
            ->select(
                'CASE WHEN t.payer = :user THEN IDENTITY(t.payee) ELSE IDENTITY(t.payer) END AS counterpartId',
                'MAX(t.createdAt) AS lastCreatedAt',
            )
            ->where('t.payer = :user OR t.payee = :user')
            ->groupBy('counterpartId')
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        $lastCreatedAt = [];
        foreach ($rows as $row) {
            $lastCreatedAt[(int) $row['counterpartId']] = new \DateTimeImmutable($row['lastCreatedAt']);
        }

        return $lastCreatedAt;
    }
}
