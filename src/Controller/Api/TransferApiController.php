<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\TransferRequest;
use App\Dto\TransferResponse;
use App\Dto\TransferUpdateRequest;
use App\Entity\Transfer;
use App\Entity\User;
use App\Repository\TransferRepository;
use App\Services\TransferService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class TransferApiController extends AbstractController
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
        private readonly TransferService $transferService,
    ) {
    }

    #[Route('/transfers', name: 'api_transfers_create', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function create(
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: JsonResponse::HTTP_BAD_REQUEST)]
        TransferRequest $request,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $transfer = $this->transferService->create($user, $request);

        return $this->json($this->toResponse($transfer), JsonResponse::HTTP_CREATED);
    }

    #[Route('/transfers/{id}', name: 'api_transfers_update', methods: ['PUT'])]
    #[IsGranted('ROLE_USER')]
    public function update(
        int $id,
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: JsonResponse::HTTP_BAD_REQUEST)]
        TransferUpdateRequest $request,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $transfer = $this->transferRepository->find($id);
        if (null === $transfer) {
            throw $this->createNotFoundException('Transfer not found.');
        }

        $transfer = $this->transferService->update($user, $transfer, $request);

        return $this->json($this->toResponse($transfer));
    }

    #[Route('/transfers/{id}', name: 'api_transfers_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_USER')]
    public function delete(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $transfer = $this->transferRepository->find($id);
        if (null === $transfer) {
            throw $this->createNotFoundException('Transfer not found.');
        }

        $this->transferService->delete($user, $transfer);

        return new JsonResponse(null, JsonResponse::HTTP_NO_CONTENT);
    }

    private function toResponse(Transfer $transfer): TransferResponse
    {
        return new TransferResponse(
            id: $transfer->getId(),
            payerId: $transfer->getPayer()->getId(),
            payeeId: $transfer->getPayee()->getId(),
            amount: $transfer->getAmount(),
            currency: $transfer->getCurrency(),
            occurredOn: $transfer->getOccurredOn(),
            description: $transfer->getDescription(),
        );
    }
}
