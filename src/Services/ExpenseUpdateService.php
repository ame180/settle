<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\UpdateExpenseRequest;
use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class ExpenseUpdateService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function update(User $editor, Expense $expense, UpdateExpenseRequest $request): Expense
    {
        if (!$this->isUserInvolved($editor, $expense)) {
            throw new AccessDeniedHttpException('Editor must be involved in the existing expense.');
        }

        $editorId = $editor->getId();
        $userIds = [$request->payeeId];
        foreach ($request->debts as $debtRequest) {
            $userIds[] = $debtRequest->payerId;
        }

        if (null === $editorId || !in_array($editorId, $userIds, true)) {
            throw new UnprocessableEntityHttpException('Editor must be the payee or one of the debtors.');
        }

        $usersById = $this->userRepository->findIndexedById($userIds);

        if (!isset($usersById[$request->payeeId])) {
            throw new UnprocessableEntityHttpException('Payee user does not exist.');
        }

        $debtsTotal = '0.00';
        foreach ($request->debts as $debtRequest) {
            if (!isset($usersById[$debtRequest->payerId])) {
                throw new UnprocessableEntityHttpException('One or more debt users do not exist.');
            }

            $debtsTotal = bcadd($debtsTotal, $debtRequest->amount, 2);
        }

        if (0 !== bccomp($debtsTotal, $request->amount, 2)) {
            throw new BadRequestHttpException('Debts amount sum must be equal to expense amount.');
        }

        $existingDebts = $this->entityManager->getRepository(Debt::class)->findBy(['expense' => $expense]);
        foreach ($existingDebts as $debt) {
            $expense->removeDebt($debt);
            $this->entityManager->remove($debt);
        }

        $expense
            ->setPayee($usersById[$request->payeeId])
            ->setTitle($request->title)
            ->setDescription($request->description)
            ->setAmount($request->amount)
            ->setOccurredOn($request->occurredOn);

        foreach ($request->debts as $debtRequest) {
            $debt = new Debt($usersById[$debtRequest->payerId], $expense, $debtRequest->amount);
            $expense->addDebt($debt);
            $this->entityManager->persist($debt);
        }

        $this->entityManager->flush();

        return $expense;
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
