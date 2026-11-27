<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\SplitwiseImportRequest;
use App\Dto\SplitwisePreviewRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Services\ContactService;
use App\Services\Splitwise\SplitwiseImportService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class SplitwiseImportApiController extends AbstractController
{
    public function __construct(
        private readonly SplitwiseImportService $importService,
        private readonly ContactService $contactService,
        private readonly UserRepository $userRepository,
    ) {
    }

    #[Route('/contacts/{userId}/import/splitwise/preview', name: 'api_contacts_import_splitwise_preview', methods: ['POST'], requirements: ['userId' => '\d+'])]
    #[IsGranted('ROLE_USER')]
    public function preview(
        int $userId,
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: Response::HTTP_BAD_REQUEST)]
        SplitwisePreviewRequest $request,
    ): JsonResponse {
        [$user, $contact] = $this->pair($userId);

        return $this->json($this->importService->preview($user, $contact, $request->csv));
    }

    #[Route('/contacts/{userId}/import/splitwise', name: 'api_contacts_import_splitwise', methods: ['POST'], requirements: ['userId' => '\d+'])]
    #[IsGranted('ROLE_USER')]
    public function import(
        int $userId,
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: Response::HTTP_BAD_REQUEST)]
        SplitwiseImportRequest $request,
    ): JsonResponse {
        [$user, $contact] = $this->pair($userId);

        return $this->json($this->importService->import($user, $contact, $request->csv, $request->ownColumn));
    }

    /**
     * @return array{User, User}
     */
    private function pair(int $userId): array
    {
        /** @var User $user */
        $user = $this->getUser();

        if ($userId === $user->getId()) {
            throw new BadRequestHttpException('You cannot import with yourself.');
        }

        $contact = $this->userRepository->find($userId);
        if (null === $contact || !$this->contactService->isKnownContact($user, $contact)) {
            throw $this->createNotFoundException('Contact not found.');
        }

        return [$user, $contact];
    }
}
