<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\CreateExpenseRequest;
use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class ExpenseCreateService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function create(User $creator, CreateExpenseRequest $request): Expense
    {
        $userIds = [$request->payeeId];
        foreach ($request->debts as $debtRequest) {
            $userIds[] = $debtRequest->payerId;
        }

        $usersById = $this->getUsersById($userIds);

        if (!isset($usersById[$request->payeeId])) {
            throw new UnprocessableEntityHttpException('Payee user does not exist.');
        }

        $creatorId = $creator->getId();
        if (null === $creatorId || !in_array($creatorId, $userIds, true)) {
            throw new UnprocessableEntityHttpException('Creator must be the payee or one of the debtors.');
        }

        $payee = $usersById[$request->payeeId];
        $expense = new Expense($payee, $request->title, $request->description, $request->amount);

        $this->entityManager->persist($expense);

        $debtsTotal = '0.00';

        foreach ($request->debts as $debtRequest) {
            $payer = $usersById[$debtRequest->payerId] ?? null;
            if (null === $payer) {
                throw new UnprocessableEntityHttpException('One or more debt users do not exist.');
            }

            $debt = new Debt($payer, $expense, $debtRequest->amount);
            $expense->addDebt($debt);

            $this->entityManager->persist($debt);

            $debtsTotal = bcadd($debtsTotal, $debtRequest->amount, 2);
        }

        if (0 !== bccomp($debtsTotal, $request->amount, 2)) {
            throw new BadRequestHttpException('Debts amount sum must be equal to expense amount.');
        }

        $this->entityManager->flush();

        return $expense;
    }

    /**
     * @param list<int> $userIds
     *
     * @return array<int, User>
     */
    private function getUsersById(array $userIds): array
    {
        $normalizedIds = array_values(array_unique($userIds));

        $users = $this->userRepository->findBy(['id' => $normalizedIds]);
        $usersById = [];

        foreach ($users as $user) {
            $userId = $user->getId();
            if (null === $userId) {
                continue;
            }

            $usersById[$userId] = $user;
        }

        return $usersById;
    }
}
