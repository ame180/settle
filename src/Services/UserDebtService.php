<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\Expense;
use App\Entity\User;

class UserDebtService
{
    public function calculateExpenseBalanceForUser(Expense $expense, User $user): string
    {
        $balance = '0.00';

        if ($expense->getPayee()->isSameAs($user)) {
            $balance = $expense->getAmount();
        }

        foreach ($expense->getDebts() as $debt) {
            if ($debt->getPayer()->isSameAs($user)) {
                $balance = bcsub($balance, $debt->getAmount(), 2);
            }
        }

        return $balance;
    }

    /**
     * The part of an expense that is owed between the user and one counterpart, from the user's
     * perspective (positive = the counterpart owes the user). Other participants are ignored.
     */
    public function calculateExpenseBalanceBetween(Expense $expense, User $user, User $counterpart): string
    {
        $payee = $expense->getPayee();
        if (!$payee->isSameAs($user) && !$payee->isSameAs($counterpart)) {
            return '0.00';
        }

        $debtor = $payee->isSameAs($user) ? $counterpart : $user;
        $owed = '0.00';
        foreach ($expense->getDebts() as $debt) {
            if ($debt->getPayer()->isSameAs($debtor)) {
                $owed = bcadd($owed, $debt->getAmount(), 2);
            }
        }

        return $payee->isSameAs($user) ? $owed : bcsub('0', $owed, 2);
    }
}
