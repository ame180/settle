<?php

namespace App\Services;

use App\Entity\User;

class UserDebtService
{
    public function getUserDebtAmount(User $user): string
    {
        $debtAmount = 0;
        foreach ($user->getDebts() as $debt) {
            $debtAmount = bcadd($debt->getAmount(), $debtAmount, 2);
        }

        return $debtAmount;
    }
}
