<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Debt;
use App\Entity\Expense;
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

    public function testListDerivedNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/users/contacts');

        $this->assertResponseRedirects('/login');
    }

    public function testListDerivedReturnsUniqueContactsOrderedByEmail(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $currentUser = UserFactory::createUser('me@example.com');
        // alice: payee of expense where currentUser is debtor
        $alice = UserFactory::createUser('alice@example.com');
        // carol: debtor of expense where currentUser is payee
        $carol = UserFactory::createUser('carol@example.com');
        // bob: appears in both directions — should be deduplicated to one result
        $bob = UserFactory::createUser('bob@example.com');
        // nobody: shares an expense but as co-debtor with currentUser, so should not appear as a contact
        $nobody = UserFactory::createUser('nobody@example.com');

        foreach ([$currentUser, $alice, $carol, $bob, $nobody] as $user) {
            $entityManager->persist($user);
        }

        // alice is payee, currentUser is debtor
        $aliceExpense = new Expense($alice, 'Lunch', 'Shared lunch', '30.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($aliceExpense);
        $entityManager->persist(new Debt($currentUser, $aliceExpense, '30.00'));

        // currentUser is payee, carol is debtor
        $myExpense = new Expense($currentUser, 'Dinner', 'Shared dinner', '40.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($myExpense);
        $entityManager->persist(new Debt($carol, $myExpense, '40.00'));

        // bob appears via both paths: payee of one expense and debtor on another
        $bobExpense = new Expense($bob, 'Coffee', 'Morning coffee', '10.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($bobExpense);
        $entityManager->persist(new Debt($currentUser, $bobExpense, '5.00'));
        $entityManager->persist(new Debt($nobody, $bobExpense, '5.00'));

        $myOtherExpense = new Expense($currentUser, 'Taxi', 'Shared taxi', '20.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($myOtherExpense);
        $entityManager->persist(new Debt($bob, $myOtherExpense, '20.00'));

        $entityManager->flush();

        $client->loginUser($currentUser);
        $client->request('GET', '/api/users/contacts');

        $this->assertJsonResponseIsSuccessful();
        $this->assertJsonStructure([0 => ['id', 'email']]);

        $response = $this->getJsonResponse();
        $this->assertCount(3, $response);

        // Ordered by email ascending: alice, bob, carol
        $this->assertSame('alice@example.com', $response[0]['email']);
        $this->assertSame($alice->getId(), $response[0]['id']);
        $this->assertSame('bob@example.com', $response[1]['email']);
        $this->assertSame($bob->getId(), $response[1]['id']);
        $this->assertSame('carol@example.com', $response[2]['email']);
        $this->assertSame($carol->getId(), $response[2]['id']);
    }

    public function testListDerivedExcludesSelf(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $currentUser = UserFactory::createUser('me@example.com');
        $entityManager->persist($currentUser);

        // currentUser is both payee and debtor on the same expense
        $expense = new Expense($currentUser, 'Self-split', 'Test', '50.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($currentUser, $expense, '50.00'));
        $entityManager->flush();

        $client->loginUser($currentUser);
        $client->request('GET', '/api/users/contacts');

        $this->assertJsonResponseIsSuccessful();
        $this->assertSame([], $this->getJsonResponse());
    }

    public function testListDerivedReturnsEmptyWithNoSharedExpenses(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $currentUser = UserFactory::createUser('me@example.com');
        $entityManager->persist($currentUser);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $client->request('GET', '/api/users/contacts');

        $this->assertJsonResponseIsSuccessful();
        $this->assertSame([], $this->getJsonResponse());
    }
}
