<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ExpenseRequest;
use App\Dto\ExpenseResponse;
use App\Entity\Expense;
use App\Entity\User;
use App\Repository\ExpenseRepository;
use App\Security\Voter\ExpenseVoter;
use App\Services\ExpenseCreateService;
use App\Services\ExpenseDeleteService;
use App\Services\ExpenseUpdateService;
use App\Services\PersonRefFactory;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class ExpenseApiController extends AbstractController
{
    public function __construct(
        private readonly ExpenseRepository $expenseRepository,
        private readonly ExpenseCreateService $expenseCreateService,
        private readonly ExpenseUpdateService $expenseUpdateService,
        private readonly ExpenseDeleteService $expenseDeleteService,
        private readonly PersonRefFactory $personRefFactory,
    ) {
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

        return $this->json($this->toResponse($user, $expense), JsonResponse::HTTP_CREATED);
    }

    #[Route('/expenses/{id}', name: 'api_expenses_show', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function show(int $id): JsonResponse
    {
        $expense = $this->expenseRepository->findOneByIdWithDebts($id);
        if (null === $expense) {
            throw $this->createNotFoundException('Expense not found.');
        }

        $this->denyAccessUnlessGranted(ExpenseVoter::VIEW, $expense);

        /** @var User $user */
        $user = $this->getUser();

        return $this->json($this->toResponse($user, $expense));
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

        $this->denyAccessUnlessGranted(ExpenseVoter::EDIT, $expense);

        $expense = $this->expenseUpdateService->update($user, $expense, $request);

        return $this->json($this->toResponse($user, $expense));
    }

    #[Route('/expenses/{id}', name: 'api_expenses_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_USER')]
    public function delete(int $id): JsonResponse
    {
        $expense = $this->expenseRepository->findOneByIdWithDebts($id);
        if (null === $expense) {
            throw $this->createNotFoundException('Expense not found.');
        }

        $this->denyAccessUnlessGranted(ExpenseVoter::DELETE, $expense);

        $this->expenseDeleteService->delete($expense);

        return new JsonResponse(null, JsonResponse::HTTP_NO_CONTENT);
    }

    private function toResponse(User $viewer, Expense $expense): ExpenseResponse
    {
        $participants = [$expense->getPayee()];
        foreach ($expense->getDebts() as $debt) {
            $participants[] = $debt->getPayer();
        }

        return ExpenseResponse::fromExpense($expense, $this->personRefFactory->createMany($viewer, $participants));
    }
}
