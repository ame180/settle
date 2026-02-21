<?php

declare(strict_types=1);

namespace App\Tests\Support\Factory;

use App\Entity\User;
use Faker\Factory;

class UserFactory
{
    public static function createUser(?string $email = null, ?string $password = 'password'): User
    {
        return (new User())
            ->setEmail($email ?? Factory::create()->email())
            ->setPassword($password);
    }
}
