<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;

class AuthApiControllerTest extends ApiTestCase
{
    public function testMeNotLoggedInReturnsJson401(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/me');

        $this->assertResponseStatusCodeSame(401);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertSame(401, $this->getJsonResponse()['status']);
    }

    public function testMeReturnsCurrentUser(): void
    {
        $client = static::createClient();
        $user = UserFactory::createUser('me@example.com');
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/me');

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame(['id' => $user->getId(), 'email' => 'me@example.com'], $this->getJsonResponse());
    }

    public function testUnknownApiRouteRendersProblemDetailsJson(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/does-not-exist');

        $this->assertResponseStatusCodeSame(404);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertJsonStructure(['title', 'status', 'detail']);
    }

    public function testNonJsonBodyIsRejected(): void
    {
        $client = static::createClient();
        $user = UserFactory::createUser();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);
        $client->request('POST', '/api/expenses', ['title' => 'form encoded']);

        $this->assertResponseStatusCodeSame(415);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertSame(415, $this->getJsonResponse()['status']);
    }
}
