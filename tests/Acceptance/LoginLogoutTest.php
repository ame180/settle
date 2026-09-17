<?php

declare(strict_types=1);

namespace App\Tests\Acceptance;

use App\Entity\User;
use App\Tests\Support\ApiTestCase;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class LoginLogoutTest extends ApiTestCase
{
    public function testUserCanLoginAndLogout(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);
        $passwordHasher = $container->get(UserPasswordHasherInterface::class);

        $user = new User();
        $user->setEmail('test@example.com');
        $user->setPassword($passwordHasher->hashPassword($user, 'password123'));

        $entityManager->persist($user);
        $entityManager->flush();

        $this->requestJson($client, 'POST', '/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertJsonStructure(['id', 'email']);
        $this->assertSame('test@example.com', $this->getJsonResponse()['email']);

        $client->request('GET', '/api/me');
        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame($user->getId(), $this->getJsonResponse()['id']);

        $client->request('POST', '/api/logout');
        $this->assertResponseStatusCodeSame(204);

        $client->request('GET', '/api/me');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testInvalidCredentialsAreRejected(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);
        $passwordHasher = $container->get(UserPasswordHasherInterface::class);

        $user = new User();
        $user->setEmail('test@example.com');
        $user->setPassword($passwordHasher->hashPassword($user, 'password123'));

        $entityManager->persist($user);
        $entityManager->flush();

        $this->requestJson($client, 'POST', '/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrong',
        ]);

        $this->assertResponseStatusCodeSame(401);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertArrayHasKey('error', $this->getJsonResponse());
    }

    public function testShadowUserCannotLogin(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);

        $shadowUser = new User();
        $shadowUser->setEmail('shadow@example.com');
        $shadowUser->setPassword(null);

        $entityManager->persist($shadowUser);
        $entityManager->flush();

        $this->requestJson($client, 'POST', '/api/login', [
            'email' => 'shadow@example.com',
            'password' => 'any-password',
        ]);

        $this->assertResponseStatusCodeSame(401);

        $client->request('GET', '/api/me');
        $this->assertResponseStatusCodeSame(401);
    }
}
