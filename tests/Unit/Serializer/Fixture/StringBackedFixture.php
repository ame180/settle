<?php

declare(strict_types=1);

namespace App\Tests\Unit\Serializer\Fixture;

enum StringBackedFixture: string
{
    case First = 'first';
    case Second = 'second';
}
