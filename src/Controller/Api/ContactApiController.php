<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ContactRequest;
use App\Dto\ContactUpdateRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Services\ContactService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class ContactApiController extends AbstractController
{
    public function __construct(
        private readonly ContactService $contactService,
        private readonly UserRepository $userRepository,
    ) {
    }

    #[Route('/contacts', name: 'api_contacts_list', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function list(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json($this->contactService->list($user));
    }

    #[Route('/contacts', name: 'api_contacts_create', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function create(
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: Response::HTTP_BAD_REQUEST)]
        ContactRequest $contactCreateRequest,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $normalizedEmail = mb_strtolower(trim($contactCreateRequest->email));
        if ($normalizedEmail === $user->getEmail()) {
            throw new BadRequestHttpException('You cannot add yourself as a contact.');
        }

        [$contactUser, $created] = $this->contactService->addByEmail($user, $normalizedEmail, $contactCreateRequest->nickname);

        return $this->json(
            $this->contactService->get($user, $contactUser),
            $created ? Response::HTTP_CREATED : Response::HTTP_OK,
        );
    }

    #[Route('/contacts/{userId}', name: 'api_contacts_update', methods: ['PUT'], requirements: ['userId' => '\d+'])]
    #[IsGranted('ROLE_USER')]
    public function update(
        int $userId,
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: Response::HTTP_BAD_REQUEST)]
        ContactUpdateRequest $contactUpdateRequest,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        if ($userId === $user->getId()) {
            throw new BadRequestHttpException('You cannot add yourself as a contact.');
        }

        $contactUser = $this->userRepository->find($userId);
        if (null === $contactUser || !$this->contactService->isKnownContact($user, $contactUser)) {
            throw $this->createNotFoundException('Contact not found.');
        }

        $this->contactService->setNickname($user, $contactUser, $contactUpdateRequest->nickname);

        return $this->json($this->contactService->get($user, $contactUser));
    }
}
