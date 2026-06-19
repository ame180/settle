<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\ExpenseRequest;
use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class ExpenseCreateService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly SplitCalculator $splitCalculator,
    ) {
    }

    public function create(User $creator, ExpenseRequest $request): Expense
    {
        $userIds = [$request->payeeId];
        foreach ($request->debts as $debtRequest) {
            $userIds[] = $debtRequest->payerId;
        }

        $usersById = $this->userRepository->findIndexedById($userIds);

        if (!isset($usersById[$request->payeeId])) {
            throw new UnprocessableEntityHttpException('Payee user does not exist.');
        }

        $creatorId = $creator->getId();
        if (null === $creatorId || !in_array($creatorId, $userIds, true)) {
            throw new UnprocessableEntityHttpException('Creator must be the payee or one of the debtors.');
        }

        foreach ($request->debts as $debtRequest) {
            if (!isset($usersById[$debtRequest->payerId])) {
                throw new UnprocessableEntityHttpException('One or more debt users do not exist.');
            }
        }

        $payee = $usersById[$request->payeeId];
        $expense = new Expense($payee, $request->title, $request->description, $request->amount, $request->occurredOn, splitType: $request->splitType);

        $this->entityManager->persist($expense);

        $splits = $this->splitCalculator->calculate($request->splitType, $request->amount, $request->debts);

        foreach ($splits as $split) {
            $debt = new Debt($usersById[$split['payerId']], $expense, $split['amount'], $expense->getCurrency(), $split['splitValue']);
            $expense->addDebt($debt);
            $this->entityManager->persist($debt);
        }

        $this->entityManager->flush();

        return $expense;
    }
}
