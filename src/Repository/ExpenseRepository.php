<?php

declare(strict_types=1);

namespace App\Repository;

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
     * Find all expenses where user is either the payee or a debtor.
     *
     * @return Expense[]
     */
    public function findByUserParticipation(User $user, int $limit, int $offset): array
    {
        return $this->createQueryBuilder('e')
            ->leftJoin('e.debts', 'd')
            ->where('e.payee = :user OR d.payer = :user')
            ->setParameter('user', $user)
            ->orderBy('e.id', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }
}
