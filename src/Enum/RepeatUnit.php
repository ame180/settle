<?php

declare(strict_types=1);

namespace App\Enum;

enum RepeatUnit: string
{
    case Week = 'week';
    case Month = 'month';
    case Year = 'year';
}
