<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Expense;
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
}
