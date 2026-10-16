<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Transfer;
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
}
