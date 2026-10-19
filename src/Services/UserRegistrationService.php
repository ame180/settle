<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\User;
use App\Exception\EmailAlreadyRegisteredException;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserRegistrationService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository $userRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    /**
     * Creates a user, or claims the shadow user behind the email by setting its password,
     * which keeps the shadow user's id and history.
     *
     * @return array{User, bool} the registered user and whether an existing shadow user was claimed
     *
     * @throws EmailAlreadyRegisteredException when the email belongs to a registered user
     */
    public function register(string $email, string $plainPassword, ?string $name = null): array
    {
        $normalizedEmail = mb_strtolower(trim($email));

        $user = $this->userRepository->findOneBy(['email' => $normalizedEmail]);
        if (null !== $user && $user->isRegistered()) {
            throw new EmailAlreadyRegisteredException();
        }

        $isClaimingShadowUser = null !== $user;

        if (null === $user) {
            $user = new User();
            $user->setEmail($normalizedEmail);
            $this->entityManager->persist($user);
        }

        $user->setPassword($this->passwordHasher->hashPassword($user, $plainPassword));
        if (null !== $name) {
            $user->setName($name);
        }

        $this->entityManager->flush();

        return [$user, $isClaimingShadowUser];
    }
}
