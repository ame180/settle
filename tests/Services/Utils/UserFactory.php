<?php

declare(strict_types=1);

namespace App\Tests\Services\Utils;

use App\Entity\User;
use Faker\Factory;

class UserFactory
{
    public static function createUser(): User
    {
        $user = new User();

        return $user->setEmail(Factory::create()->email());
    }
}
