<?php

declare(strict_types=1);

namespace App\Enum;

enum ExpenseCategory: string
{
    case Groceries = 'groceries';
    case FoodAndDrink = 'food_and_drink';
    case Transport = 'transport';
    case HomeAndBills = 'home_and_bills';
    case Entertainment = 'entertainment';
    case Gifts = 'gifts';
    case Health = 'health';
    case General = 'general';
}
