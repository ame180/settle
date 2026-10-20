<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Expense>
 */
class ExpenseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Expense::class);
    }

    /**
     * @param list<int> $ids
     *
     * @return list<Expense>
     */
    public function findByIdsWithDebts(array $ids): array
    {
        if ([] === $ids) {
            return [];
        }

        return $this->createQueryBuilder('e')
            ->leftJoin('e.debts', 'd')
            ->addSelect('d')
            ->leftJoin('d.payer', 'p')
            ->addSelect('p')
            ->leftJoin('e.payee', 'payee')
            ->addSelect('payee')
            ->where('e.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();
    }

    public function findOneByIdWithDebts(int $id): ?Expense
    {
        return $this->createQueryBuilder('e')
            ->leftJoin('e.debts', 'd')
            ->addSelect('d')
            ->leftJoin('d.payer', 'p')
            ->addSelect('p')
            ->leftJoin('e.payee', 'payee')
            ->addSelect('payee')
            ->where('e.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Latest expense creation time per pairwise counterpart (payee and debtor, as in balances).
     * Edits keep the original creation time, and deleted expenses leave no trace.
     *
     * @return array<int, \DateTimeImmutable> keyed by counterpart user id
     */
    public function findLastCreatedAtByCounterpart(User $user): array
    {
        /** @var list<array{counterpartId: int|string, lastCreatedAt: string}> $rows */
        $rows = $this->getEntityManager()->createQueryBuilder()
            ->select(
                'CASE WHEN e.payee = :user THEN IDENTITY(d.payer) ELSE IDENTITY(e.payee) END AS counterpartId',
                'MAX(e.createdAt) AS lastCreatedAt',
            )
            ->from(Debt::class, 'd')
            ->join('d.expense', 'e')
            ->where('e.payee = :user OR d.payer = :user')
            ->andWhere('d.payer != e.payee')
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
