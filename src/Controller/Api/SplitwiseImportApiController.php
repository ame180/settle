<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\SplitwiseImportRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Services\ContactService;
use App\Services\Splitwise\SplitwiseImportService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
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

    /**
     * With dryRun=1 nothing is written and the response describes both ways the file's two
     * people could map onto the pair; otherwise ownColumn picks one and the rows are imported.
     */
    #[Route('/contacts/{userId}/import/splitwise', name: 'api_contacts_import_splitwise', methods: ['POST'], requirements: ['userId' => '\d+'])]
    #[IsGranted('ROLE_USER')]
    public function import(
        int $userId,
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: Response::HTTP_BAD_REQUEST)]
        SplitwiseImportRequest $request,
        #[MapQueryParameter]
        bool $dryRun = false,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        if ($userId === $user->getId()) {
            throw new BadRequestHttpException('You cannot import with yourself.');
        }

        $contact = $this->userRepository->find($userId);
        if (null === $contact || !$this->contactService->isKnownContact($user, $contact)) {
            throw $this->createNotFoundException('Contact not found.');
        }

        if ($dryRun) {
            return $this->json($this->importService->preview($user, $contact, $request->csv));
        }

        if (null === $request->ownColumn) {
            throw new BadRequestHttpException('Choose which person in the file is you.');
        }

        return $this->json($this->importService->import($user, $contact, $request->csv, $request->ownColumn));
    }
}
