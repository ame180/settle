<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\MeResponse;
use App\Dto\MeUpdateRequest;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class AuthApiController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('/login', name: 'api_login', methods: ['POST'])]
    public function login(): never
    {
        throw new \LogicException('This method can be blank - it will be intercepted by the json_login key on your firewall.');
    }

    #[Route('/logout', name: 'api_logout', methods: ['POST'])]
    public function logout(): never
    {
        throw new \LogicException('This method can be blank - it will be intercepted by the logout key on your firewall.');
    }

    #[Route('/me', name: 'api_me', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json(MeResponse::fromUser($user));
    }

    #[Route('/me', name: 'api_me_update', methods: ['PATCH'])]
    #[IsGranted('ROLE_USER')]
    public function updateMe(
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: JsonResponse::HTTP_BAD_REQUEST)]
        MeUpdateRequest $meUpdateRequest,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $user->setName($meUpdateRequest->name);
        $this->entityManager->flush();

        return $this->json(MeResponse::fromUser($user));
    }
}
