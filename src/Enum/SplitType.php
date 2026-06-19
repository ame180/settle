<?php

declare(strict_types=1);

namespace App\Enum;

enum SplitType: string
{
    case Exact = 'exact';
    case Percentage = 'percentage';
    case Shares = 'shares';
    case Equal = 'equal';
}
