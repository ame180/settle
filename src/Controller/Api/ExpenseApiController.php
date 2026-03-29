<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\CreateExpenseRequest;
use App\Dto\CreateExpenseResponse;
use App\Dto\ExpenseListItemDto;
use App\Dto\PaginationQuery;
use App\Dto\UpdateExpenseRequest;
use App\Entity\Expense;
use App\Entity\User;
use App\Repository\ExpenseRepository;
use App\Services\ExpenseCreateService;
use App\Services\ExpenseUpdateService;
use App\Services\UserDebtService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class ExpenseApiController extends AbstractController
{
    public function __construct(
        private readonly ExpenseRepository $expenseRepository,
        private readonly UserDebtService $userDebtService,
        private readonly ExpenseCreateService $expenseCreateService,
        private readonly ExpenseUpdateService $expenseUpdateService,
    ) {
    }

    #[Route('/expenses', name: 'api_expenses_list', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function list(
        #[MapQueryString] PaginationQuery $pagination = new PaginationQuery(),
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $expenses = $this->expenseRepository->findByUserParticipation(
            $user,
            $pagination->limit,
            $pagination->offset
        );

        $dtos = array_map(
            fn (Expense $expense) => new ExpenseListItemDto(
                id: $expense->getId(),
                title: $expense->getTitle(),
                description: $expense->getDescription(),
                payeeEmail: $expense->getPayee()->getEmail(),
                currency: $expense->getCurrency(),
                value: $this->userDebtService->calculateExpenseBalanceForUser($expense, $user),
                occurredOn: $expense->getOccurredOn(),
            ),
            $expenses
        );

        return $this->json($dtos);
    }

    #[Route('/expenses', name: 'api_expenses_create', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function create(
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: JsonResponse::HTTP_BAD_REQUEST)]
        CreateExpenseRequest $request,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $expense = $this->expenseCreateService->create($user, $request);

        return $this->json(new CreateExpenseResponse(
            id: $expense->getId(),
            title: $expense->getTitle(),
            description: $expense->getDescription(),
            amount: $expense->getAmount(),
            currency: $expense->getCurrency(),
            payeeId: $expense->getPayee()->getId(),
            occurredOn: $expense->getOccurredOn(),
        ), JsonResponse::HTTP_CREATED);
    }

    #[Route('/expenses/{id}', name: 'api_expenses_update', methods: ['PUT'])]
    #[IsGranted('ROLE_USER')]
    public function update(
        int $id,
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: JsonResponse::HTTP_BAD_REQUEST)]
        UpdateExpenseRequest $request,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $expense = $this->expenseRepository->findOneByIdWithDebts($id);
        if (null === $expense) {
            throw $this->createNotFoundException('Expense not found.');
        }

        $expense = $this->expenseUpdateService->update($user, $expense, $request);

        return $this->json(new CreateExpenseResponse(
            id: $expense->getId(),
            title: $expense->getTitle(),
            description: $expense->getDescription(),
            amount: $expense->getAmount(),
            currency: $expense->getCurrency(),
            payeeId: $expense->getPayee()->getId(),
            occurredOn: $expense->getOccurredOn(),
        ));
    }
}
