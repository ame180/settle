<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Returns unique users who share an Expense with the given user:
     * - payees of expenses where the user is a debtor, and
     * - debtors of expenses where the user is the payee.
     * Excludes the user themselves. Ordered by email ascending.
     *
     * @return array<string, User> Array of users keyed by email
     */
    public function findDerivedContactsForUser(User $user): array
    {
        /** @var User[] $payees */
        $payees = $this->createQueryBuilder('u')
            ->join('u.expenses', 'expense')
            ->join('expense.debts', 'debt')
            ->where('debt.payer = :user')
            ->andWhere('u != :user')
            ->setParameter('user', $user)
            ->distinct()
            ->getQuery()
            ->getResult();

        /** @var User[] $debtors */
        $debtors = $this->createQueryBuilder('u')
            ->join('u.debts', 'debt')
            ->join('debt.expense', 'expense')
            ->where('expense.payee = :user')
            ->andWhere('u != :user')
            ->setParameter('user', $user)
            ->distinct()
            ->getQuery()
            ->getResult();

        /** @var User[] $contacts */
        $contacts = array_merge($payees, $debtors);
        $contactsByEmail = [];
        foreach ($contacts as $contact) {
            $contactsByEmail[$contact->getEmail()] = $contact;
        }

        ksort($contactsByEmail);

        return $contactsByEmail;
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }
}
