<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Contact;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Contact>
 */
class ContactRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Contact::class);
    }

    public function findOneByOwnerAndUser(User $owner, User $user): ?Contact
    {
        return $this->findOneBy(['owner' => $owner, 'user' => $user]);
    }

    /**
     * @return array<int, Contact> keyed by contact user id
     */
    public function findByOwnerIndexedByUserId(User $owner): array
    {
        /** @var list<Contact> $contacts */
        $contacts = $this->createQueryBuilder('c')
            ->addSelect('u')
            ->join('c.user', 'u')
            ->where('c.owner = :owner')
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getResult();

        $indexed = [];
        foreach ($contacts as $contact) {
            $indexed[(int) $contact->getUser()->getId()] = $contact;
        }

        return $indexed;
    }

    /**
     * @param list<int> $userIds
     *
     * @return array<int, string> nicknames keyed by contact user id
     */
    public function findNicknamesByOwner(User $owner, array $userIds): array
    {
        if ([] === $userIds) {
            return [];
        }

        /** @var list<array{userId: int|string, nickname: string}> $rows */
        $rows = $this->createQueryBuilder('c')
            ->select('IDENTITY(c.user) AS userId', 'c.nickname AS nickname')
            ->where('c.owner = :owner')
            ->andWhere('c.user IN (:userIds)')
            ->andWhere('c.nickname IS NOT NULL')
            ->setParameter('owner', $owner)
            ->setParameter('userIds', $userIds)
            ->getQuery()
            ->getArrayResult();

        $nicknames = [];
        foreach ($rows as $row) {
            $nicknames[(int) $row['userId']] = $row['nickname'];
        }

        return $nicknames;
    }
}
