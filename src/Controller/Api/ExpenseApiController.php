<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ExpenseRequest;
use App\Dto\ExpenseResponse;
use App\Dto\ExpenseSummary;
use App\Dto\PaginationQuery;
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
            fn (Expense $expense) => new ExpenseSummary(
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
        ExpenseRequest $request,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $expense = $this->expenseCreateService->create($user, $request);

        return $this->json(ExpenseResponse::fromExpense($expense), JsonResponse::HTTP_CREATED);
    }

    #[Route('/expenses/{id}', name: 'api_expenses_show', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function show(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $expense = $this->expenseRepository->findOneByIdWithDebts($id);
        if (null === $expense) {
            throw $this->createNotFoundException('Expense not found.');
        }

        if (!$this->isUserInvolved($user, $expense)) {
            throw $this->createAccessDeniedException('You are not involved in this expense.');
        }

        return $this->json(ExpenseResponse::fromExpense($expense));
    }

    #[Route('/expenses/{id}', name: 'api_expenses_update', methods: ['PUT'])]
    #[IsGranted('ROLE_USER')]
    public function update(
        int $id,
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: JsonResponse::HTTP_BAD_REQUEST)]
        ExpenseRequest $request,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $expense = $this->expenseRepository->findOneByIdWithDebts($id);
        if (null === $expense) {
            throw $this->createNotFoundException('Expense not found.');
        }

        $expense = $this->expenseUpdateService->update($user, $expense, $request);

        return $this->json(ExpenseResponse::fromExpense($expense));
    }

    private function isUserInvolved(User $user, Expense $expense): bool
    {
        if ($expense->getPayee()->getId() === $user->getId()) {
            return true;
        }

        foreach ($expense->getDebts() as $debt) {
            if ($debt->getPayer()->getId() === $user->getId()) {
                return true;
            }
        }

        return false;
    }
}
