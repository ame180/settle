<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\ContactListItem;
use App\Dto\ContactListResponse;
use App\Dto\CurrencyAmount;
use App\Dto\PersonRef;
use App\Entity\Contact;
use App\Entity\User;
use App\Repository\ContactRepository;
use App\Repository\ExpenseRepository;
use App\Repository\TransferRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

class ContactService
{
    public function __construct(
        private readonly BalanceService $balanceService,
        private readonly PersonRefFactory $personRefFactory,
        private readonly ContactRepository $contactRepository,
        private readonly ExpenseRepository $expenseRepository,
        private readonly TransferRepository $transferRepository,
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Every pairwise counterpart plus everyone the owner has a Contact row for, settled or not.
     */
    public function list(User $owner): ContactListResponse
    {
        $balancesByCounterpart = $this->balanceService->getBalancesByCounterpart($owner);
        $contacts = $this->contactRepository->findByOwnerIndexedByUserId($owner);
        $lastActivityByCounterpart = $this->getLastActivityByCounterpart($owner, $contacts);

        $userIds = array_values(array_unique([...array_keys($balancesByCounterpart), ...array_keys($contacts)]));
        $users = [] === $userIds ? [] : $this->userRepository->findBy(['id' => $userIds]);
        $people = $this->personRefFactory->createMany($owner, $users);

        $items = [];
        foreach ($users as $user) {
            $userId = (int) $user->getId();
            $items[] = $this->buildItem(
                $user,
                $people[$userId],
                $contacts[$userId] ?? null,
                $balancesByCounterpart[$userId] ?? [],
                $lastActivityByCounterpart[$userId] ?? throw new \LogicException('A contact must have a Contact row or shared activity.'),
            );
        }

        usort($items, static fn (ContactListItem $a, ContactListItem $b): int => [mb_strtolower($a->person->displayName), $a->person->id]
            <=> [mb_strtolower($b->person->displayName), $b->person->id]);

        return new ContactListResponse(
            totals: $this->balanceService->sumTotals($balancesByCounterpart),
            items: $items,
        );
    }

    public function get(User $owner, User $user): ContactListItem
    {
        $balancesByCounterpart = $this->balanceService->getBalancesByCounterpart($owner);
        $userId = (int) $user->getId();
        $contact = $this->contactRepository->findOneByOwnerAndUser($owner, $user);
        $lastActivityByCounterpart = $this->getLastActivityByCounterpart($owner, null === $contact ? [] : [$userId => $contact]);

        $lastActivityAt = $lastActivityByCounterpart[$userId] ?? null;
        if (null === $lastActivityAt) {
            throw new \LogicException('A contact must have a Contact row or shared activity.');
        }

        return $this->buildItem(
            $user,
            $this->personRefFactory->create($owner, $user),
            $contact,
            $balancesByCounterpart[$userId] ?? [],
            $lastActivityAt,
        );
    }

    /**
     * A user is a known contact when they share a pairwise expense or transfer with the owner,
     * or the owner has added them explicitly.
     */
    public function isKnownContact(User $owner, User $user): bool
    {
        if (null !== $this->contactRepository->findOneByOwnerAndUser($owner, $user)) {
            return true;
        }

        return array_key_exists((int) $user->getId(), $this->balanceService->getBalancesByCounterpart($owner));
    }

    public function setNickname(User $owner, User $user, ?string $nickname): void
    {
        $contact = $this->contactRepository->findOneByOwnerAndUser($owner, $user);

        if (null === $contact) {
            $this->entityManager->persist(new Contact($owner, $user, $nickname));
            $this->entityManager->flush();

            return;
        }

        $contact->setNickname($nickname);
        $this->entityManager->flush();
    }

    /**
     * Finds or creates the (shadow) user behind the email and makes sure the owner has a
     * Contact row for them. The nickname is only touched when a non-blank one is given.
     *
     * @return array{User, bool} the contact user and whether that user was newly created
     */
    public function addByEmail(User $owner, string $normalizedEmail, ?string $nickname): array
    {
        [$user, $created] = $this->findOrCreateUser($normalizedEmail);

        $contact = $this->contactRepository->findOneByOwnerAndUser($owner, $user);
        if (null === $contact) {
            $this->entityManager->persist(new Contact($owner, $user, $nickname));
        } elseif (null !== $nickname && '' !== trim($nickname)) {
            $contact->setNickname($nickname);
        }

        $this->entityManager->flush();

        return [$user, $created];
    }

    /**
     * @return array{User, bool}
     */
    private function findOrCreateUser(string $normalizedEmail): array
    {
        $user = $this->userRepository->findOneBy(['email' => $normalizedEmail]);
        if (null !== $user) {
            return [$user, false];
        }

        $user = new User();
        $user->setEmail($normalizedEmail);
        $user->setPassword(null);

        $this->entityManager->persist($user);

        return [$user, true];
    }

    /**
     * Latest of: expense or transfer created between the pair, or the owner's Contact row created.
     * Only creations count: edits and deletions do not move the date, and someone added to an
     * existing expense gets that expense's original creation time.
     *
     * @param array<int, Contact> $contacts keyed by contact user id
     *
     * @return array<int, \DateTimeImmutable> keyed by counterpart user id
     */
    private function getLastActivityByCounterpart(User $owner, array $contacts): array
    {
        $lastActivity = $this->expenseRepository->findLastCreatedAtByCounterpart($owner);
        $otherSources = [
            $this->transferRepository->findLastCreatedAtByCounterpart($owner),
            array_map(static fn (Contact $contact): \DateTimeImmutable => $contact->getCreatedAt(), $contacts),
        ];

        foreach ($otherSources as $createdAtByCounterpart) {
            foreach ($createdAtByCounterpart as $userId => $createdAt) {
                $lastActivity[$userId] = max($lastActivity[$userId] ?? $createdAt, $createdAt);
            }
        }

        return $lastActivity;
    }

    /**
     * @param list<CurrencyAmount> $balances
     */
    private function buildItem(User $user, PersonRef $person, ?Contact $contact, array $balances, \DateTimeImmutable $lastActivityAt): ContactListItem
    {
        return new ContactListItem(
            person: $person,
            nickname: $contact?->getNickname(),
            name: $user->getName(),
            isRegistered: $user->isRegistered(),
            balances: $balances,
            lastActivityAt: $lastActivityAt,
        );
    }
}
