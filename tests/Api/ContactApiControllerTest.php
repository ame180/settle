<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\User;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;

class ContactApiControllerTest extends ApiTestCase
{
    public function testCreateNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/contacts',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'friend@example.com'])
        );

        $this->assertResponseRedirects('/login');
    }

    public function testCreateContactCreatesShadowUser(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);
        $userRepository = $entityManager->getRepository(User::class);

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $entityManager->persist($authenticatedUser);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $client->request(
            'POST',
            '/api/contacts',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => '  Friend@Example.com  '])
        );

        $this->assertJsonResponseIsSuccessful();
        $this->assertJsonStructure(['id', 'email', 'isRegistered']);

        $response = $this->getJsonResponse();
        $this->assertSame('friend@example.com', $response['email']);
        $this->assertFalse($response['isRegistered']);

        $shadowUser = $userRepository->findOneBy(['email' => 'friend@example.com']);
        $this->assertNotNull($shadowUser);
        $this->assertNull($shadowUser->getPassword());
    }

    public function testCreateContactReturnsExistingRegisteredUser(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);
        $userRepository = $entityManager->getRepository(User::class);

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $registeredContact = UserFactory::createUser('friend@example.com', 'hashed-password');

        $entityManager->persist($authenticatedUser);
        $entityManager->persist($registeredContact);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $client->request(
            'POST',
            '/api/contacts',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'Friend@Example.com'])
        );

        $this->assertJsonResponseIsSuccessful();

        $response = $this->getJsonResponse();
        $this->assertSame($registeredContact->getId(), $response['id']);
        $this->assertTrue($response['isRegistered']);
        $this->assertSame(2, $userRepository->count());
    }

    public function testCreateContactReturnsExistingShadowUser(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $shadowContact = UserFactory::createUser('friend@example.com', null);

        $entityManager->persist($authenticatedUser);
        $entityManager->persist($shadowContact);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $client->request(
            'POST',
            '/api/contacts',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'FRIEND@EXAMPLE.COM'])
        );

        $this->assertJsonResponseIsSuccessful();

        $response = $this->getJsonResponse();
        $this->assertSame($shadowContact->getId(), $response['id']);
        $this->assertFalse($response['isRegistered']);
    }

    public function testCreateContactRejectsInvalidEmail(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);
        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');

        $entityManager->persist($authenticatedUser);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $client->request(
            'POST',
            '/api/contacts',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'],
            json_encode(['email' => 'invalid-email'])
        );

        $this->assertResponseStatusCodeSame(400);
    }
}
