<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ContactListItem;
use App\Dto\ContactRequest;
use App\Dto\ContactResponse;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class ContactApiController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('/users/contacts', name: 'api_users_contacts_list_derived', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function listDerived(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $contacts = $this->userRepository->findDerivedContactsForUser($user);

        $dtos = array_map(
            fn (User $contact) => new ContactListItem(
                id: $contact->getId(),
                email: $contact->getEmail(),
            ),
            array_values($contacts)
        );

        return $this->json($dtos);
    }

    #[Route('/contacts', name: 'api_contacts_create', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function create(
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: Response::HTTP_BAD_REQUEST)]
        ContactRequest $contactCreateRequest,
    ): JsonResponse {
        $normalizedEmail = mb_strtolower(trim($contactCreateRequest->email));

        $user = $this->userRepository->findOneBy(['email' => $normalizedEmail]);

        if (null === $user) {
            $user = new User();
            $user->setEmail($normalizedEmail);
            $user->setPassword(null);

            $this->entityManager->persist($user);

            try {
                $this->entityManager->flush();
            } catch (UniqueConstraintViolationException $exception) {
                $existingUser = $this->userRepository->findOneBy(['email' => $normalizedEmail]);

                if (null === $existingUser) {
                    throw $exception;
                }

                $user = $existingUser;
            }
        }

        return $this->json(new ContactResponse(
            id: $user->getId(),
            email: $user->getEmail(),
            isRegistered: null !== $user->getPassword(),
        ));
    }
}
