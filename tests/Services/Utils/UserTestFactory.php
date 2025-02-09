<?php

namespace App\Tests\Services\Utils;

use App\Entity\User;
use Faker\Factory;

// generate data by calling methods
class UserTestFactory
{
    public static function createUser(): User
    {
        $user = new User();
        return $user->setEmail(Factory::create()->email());
    }
}