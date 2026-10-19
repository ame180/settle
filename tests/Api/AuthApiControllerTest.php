<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\User;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

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
        $this->assertSame(['id' => $user->getId(), 'email' => 'me@example.com', 'name' => null], $this->getJsonResponse());
    }

    public function testUpdateMeSetsName(): void
    {
        $client = static::createClient();
        $user = UserFactory::createUser('me@example.com');
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);
        $this->requestJson($client, 'PATCH', '/api/me', ['name' => '  Ame  ']);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame(['id' => $user->getId(), 'email' => 'me@example.com', 'name' => 'Ame'], $this->getJsonResponse());

        $this->requestJson($client, 'PATCH', '/api/me', ['name' => '']);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertNull($this->getJsonResponse()['name']);
    }

    public function testUpdateMeRejectsTooLongName(): void
    {
        $client = static::createClient();
        $user = UserFactory::createUser('me@example.com');
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);
        $this->requestJson($client, 'PATCH', '/api/me', ['name' => str_repeat('a', 65)]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testUpdateMeRequiresName(): void
    {
        $client = static::createClient();
        $user = UserFactory::createUser('me@example.com')->setName('Ame');
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);
        $this->requestJson($client, 'PATCH', '/api/me', []);

        $this->assertResponseStatusCodeSame(400);
        $entityManager->refresh($user);
        $this->assertSame('Ame', $user->getName());
    }

    public function testUpdateMeNotLoggedIn(): void
    {
        $client = static::createClient();
        $this->requestJson($client, 'PATCH', '/api/me', ['name' => 'Ame']);

        $this->assertResponseStatusCodeSame(401);
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

    public function testRegisterCreatesUserAndLogsIn(): void
    {
        $client = static::createClient();
        $this->requestJson($client, 'POST', '/api/register', [
            'email' => '  New.User@Example.com ',
            'password' => 'password123',
            'name' => '  New User ',
        ]);

        $this->assertJsonResponseIsSuccessful(201);
        $response = $this->getJsonResponse();
        $this->assertSame('new.user@example.com', $response['email']);
        $this->assertSame('New User', $response['name']);

        $client->request('GET', '/api/me');
        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame($response['id'], $this->getJsonResponse()['id']);
    }

    public function testRegisterClaimsShadowUser(): void
    {
        $client = static::createClient();
        $shadowUser = UserFactory::createUser('shadow@example.com', null);
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($shadowUser);
        $entityManager->flush();

        $this->requestJson($client, 'POST', '/api/register', [
            'email' => 'Shadow@Example.com',
            'password' => 'password123',
        ]);

        $this->assertJsonResponseIsSuccessful(201);
        $this->assertSame(['id' => $shadowUser->getId(), 'email' => 'shadow@example.com', 'name' => null], $this->getJsonResponse());

        $claimedUser = $entityManager->getRepository(User::class)->find($shadowUser->getId());
        $this->assertNotNull($claimedUser);
        $entityManager->refresh($claimedUser);
        $passwordHasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        $this->assertTrue($passwordHasher->isPasswordValid($claimedUser, 'password123'));
    }

    public function testRegisterRejectsRegisteredEmail(): void
    {
        $client = static::createClient();
        $user = UserFactory::createUser('taken@example.com');
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->persist($user);
        $entityManager->flush();

        $this->requestJson($client, 'POST', '/api/register', [
            'email' => 'Taken@example.com',
            'password' => 'password123',
        ]);

        $this->assertResponseStatusCodeSame(409);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $this->assertSame(409, $this->getJsonResponse()['status']);

        $client->request('GET', '/api/me');
        $this->assertResponseStatusCodeSame(401);
    }

    /**
     * @dataProvider invalidRegistrationProvider
     *
     * @param array<string, mixed> $payload
     */
    public function testRegisterValidatesPayload(array $payload, string $propertyPath): void
    {
        $client = static::createClient();
        $this->requestJson($client, 'POST', '/api/register', $payload);

        $this->assertResponseStatusCodeSame(400);
        $this->assertContains($propertyPath, array_column($this->getJsonResponse()['violations'], 'propertyPath'));
    }

    /**
     * @return iterable<string, array{array<string, mixed>, string}>
     */
    public static function invalidRegistrationProvider(): iterable
    {
        yield 'blank email' => [['email' => ' ', 'password' => 'password123'], 'email'];
        yield 'invalid email' => [['email' => 'not-an-email', 'password' => 'password123'], 'email'];
        yield 'too short password' => [['email' => 'user@example.com', 'password' => str_repeat('a', 7)], 'password'];
        yield 'too long password' => [['email' => 'user@example.com', 'password' => str_repeat('a', 65)], 'password'];
        yield 'too long name' => [['email' => 'user@example.com', 'password' => 'password123', 'name' => str_repeat('a', 65)], 'name'];
    }

    public function testRegisterAcceptsPasswordLengthBounds(): void
    {
        $client = static::createClient();

        $this->requestJson($client, 'POST', '/api/register', ['email' => 'short@example.com', 'password' => str_repeat('a', 8)]);
        $this->assertJsonResponseIsSuccessful(201);

        $this->requestJson($client, 'POST', '/api/register', ['email' => 'long@example.com', 'password' => str_repeat('a', 64)]);
        $this->assertJsonResponseIsSuccessful(201);
    }

    public function testRegisterIsRateLimitedPerIp(): void
    {
        $client = static::createClient();

        for ($i = 1; $i <= 10; ++$i) {
            $this->requestJson($client, 'POST', '/api/register', ['email' => "user$i@example.com", 'password' => 'password123']);
            $this->assertJsonResponseIsSuccessful(201);
        }

        $this->requestJson($client, 'POST', '/api/register', ['email' => 'user11@example.com', 'password' => 'password123']);

        $this->assertResponseStatusCodeSame(429);
        $this->assertResponseHasHeader('Retry-After');
        $this->assertSame(429, $this->getJsonResponse()['status']);

        $client->setServerParameter('REMOTE_ADDR', '10.0.0.2');
        $this->requestJson($client, 'POST', '/api/register', ['email' => 'user11@example.com', 'password' => 'password123']);

        $this->assertJsonResponseIsSuccessful(201);
    }
}
