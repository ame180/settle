<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ExpenseListItemDto;
use App\Dto\PaginationQuery;
use App\Entity\Expense;
use App\Entity\User;
use App\Repository\ExpenseRepository;
use App\Services\UserDebtService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class ExpenseApiController extends AbstractController
{
    public function __construct(
        private readonly ExpenseRepository $expenseRepository,
        private readonly UserDebtService $userDebtService,
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
                value: $this->userDebtService->calculateExpenseBalanceForUser($expense, $user),
            ),
            $expenses
        );

        return $this->json($dtos);
    }
}
