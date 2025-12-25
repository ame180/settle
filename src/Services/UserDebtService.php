<?php

declare(strict_types=1);

namespace App\Services;

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
}
