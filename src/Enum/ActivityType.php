<?php

declare(strict_types=1);

namespace App\Enum;

enum ActivityType: string
{
    case Expense = 'expense';
    case Transfer = 'transfer';
}
