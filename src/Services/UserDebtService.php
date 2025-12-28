<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\Expense;
use App\Entity\User;

class UserDebtService
{
    public function getUserDebtAmount(User $user): string
    {
        $debtAmount = '0.00';
        foreach ($user->getDebts() as $debt) {
            $debtAmount = bcadd($debt->getAmount(), $debtAmount, 2);
        }

        foreach ($user->getExpenses() as $expense) {
            $debtAmount = bcsub($debtAmount, $expense->getAmount(), 2);
        }

        return $debtAmount;
    }

    public function calculateExpenseBalanceForUser(Expense $expense, User $user): string
    {
        $balance = '0.00';

        if ($expense->getPayee() === $user) {
            $balance = $expense->getAmount();
        }

        foreach ($expense->getDebts() as $debt) {
            if ($debt->getPayer() === $user) {
                $balance = bcsub($balance, $debt->getAmount(), 2);
            }
        }

        return $balance;
    }
}
