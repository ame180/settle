<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\PersonRef;
use App\Entity\User;
use App\Repository\ContactRepository;

class PersonRefFactory
{
    public function __construct(
        private readonly ContactRepository $contactRepository,
    ) {
    }

    public function create(User $viewer, User $user): PersonRef
    {
        return $this->createMany($viewer, [$user])[(int) $user->getId()];
    }

    /**
     * Display name resolves as the viewer's nickname > the user's own name > email.
     *
     * @param iterable<User> $users
     *
     * @return array<int, PersonRef> keyed by user id
     */
    public function createMany(User $viewer, iterable $users): array
    {
        $usersById = [];
        foreach ($users as $user) {
            $usersById[(int) $user->getId()] = $user;
        }

        $nicknames = $this->contactRepository->findNicknamesByOwner($viewer, array_keys($usersById));

        $people = [];
        foreach ($usersById as $id => $user) {
            $people[$id] = new PersonRef(
                id: $id,
                displayName: $nicknames[$id] ?? $user->getName() ?? $user->getEmail(),
                email: $user->getEmail(),
            );
        }

        return $people;
    }
}
