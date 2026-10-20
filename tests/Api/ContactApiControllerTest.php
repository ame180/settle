<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Contact;
use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\Transfer;
use App\Entity\User;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;

class ContactApiControllerTest extends ApiTestCase
{
    private const array ITEM_STRUCTURE = ['person' => ['id', 'displayName', 'email'], 'nickname', 'name', 'isRegistered', 'balances', 'lastActivityAt'];

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

        $this->assertResponseStatusCodeSame(401);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
    }

    public function testCreateContactCreatesShadowUser(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();
        $userRepository = $entityManager->getRepository(User::class);

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $entityManager->persist($authenticatedUser);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $this->requestJson($client, 'POST', '/api/contacts', ['email' => '  Friend@Example.com  ']);

        $this->assertJsonResponseIsSuccessful(201);
        $this->assertJsonStructure(self::ITEM_STRUCTURE);

        $response = $this->getJsonResponse();
        $this->assertSame('friend@example.com', $response['person']['email']);
        $this->assertSame('friend@example.com', $response['person']['displayName']);
        $this->assertFalse($response['isRegistered']);
        $this->assertNull($response['nickname']);
        $this->assertSame([], $response['balances']);

        $shadowUser = $userRepository->findOneBy(['email' => 'friend@example.com']);
        $this->assertNotNull($shadowUser);
        $this->assertNull($shadowUser->getPassword());
        $this->assertNotNull($this->findContact($authenticatedUser, $shadowUser));
    }

    public function testCreateContactStoresNickname(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $entityManager->persist($authenticatedUser);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $this->requestJson($client, 'POST', '/api/contacts', ['email' => 'grandma@example.com', 'nickname' => '  Grandma  ']);

        $this->assertJsonResponseIsSuccessful(201);

        $response = $this->getJsonResponse();
        $this->assertSame('Grandma', $response['nickname']);
        $this->assertSame('Grandma', $response['person']['displayName']);
    }

    public function testCreateContactReturnsExistingRegisteredUser(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();
        $userRepository = $entityManager->getRepository(User::class);

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $registeredContact = UserFactory::createUser('friend@example.com', 'hashed-password')->setName('Friend');

        $entityManager->persist($authenticatedUser);
        $entityManager->persist($registeredContact);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $this->requestJson($client, 'POST', '/api/contacts', ['email' => 'Friend@Example.com']);

        $this->assertJsonResponseIsSuccessful(200);

        $response = $this->getJsonResponse();
        $this->assertSame($registeredContact->getId(), $response['person']['id']);
        $this->assertSame('Friend', $response['person']['displayName']);
        $this->assertSame('Friend', $response['name']);
        $this->assertTrue($response['isRegistered']);
        $this->assertSame(2, $userRepository->count());
    }

    public function testCreateContactReturnsExistingShadowUser(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $shadowContact = UserFactory::createUser('friend@example.com', null);

        $entityManager->persist($authenticatedUser);
        $entityManager->persist($shadowContact);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $this->requestJson($client, 'POST', '/api/contacts', ['email' => 'FRIEND@EXAMPLE.COM']);

        $this->assertJsonResponseIsSuccessful(200);

        $response = $this->getJsonResponse();
        $this->assertSame($shadowContact->getId(), $response['person']['id']);
        $this->assertFalse($response['isRegistered']);
    }

    public function testCreateContactKeepsExistingNicknameWhenNoneGiven(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $friend = UserFactory::createUser('friend@example.com', null);
        $entityManager->persist($authenticatedUser);
        $entityManager->persist($friend);
        $entityManager->persist(new Contact($authenticatedUser, $friend, 'Buddy'));
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $this->requestJson($client, 'POST', '/api/contacts', ['email' => 'friend@example.com']);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame('Buddy', $this->getJsonResponse()['nickname']);

        $this->requestJson($client, 'POST', '/api/contacts', ['email' => 'friend@example.com', 'nickname' => '  ']);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame('Buddy', $this->getJsonResponse()['nickname']);
    }

    public function testCreateContactRejectsOwnEmail(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $entityManager->persist($authenticatedUser);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $this->requestJson($client, 'POST', '/api/contacts', ['email' => 'Owner@Example.com']);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testCreateContactRejectsInvalidEmail(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $entityManager->persist($authenticatedUser);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $this->requestJson($client, 'POST', '/api/contacts', ['email' => 'invalid-email']);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testCreateContactRejectsTooLongNickname(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $authenticatedUser = UserFactory::createUser('owner@example.com', 'password');
        $entityManager->persist($authenticatedUser);
        $entityManager->flush();

        $client->loginUser($authenticatedUser);
        $this->requestJson($client, 'POST', '/api/contacts', ['email' => 'friend@example.com', 'nickname' => str_repeat('a', 65)]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testListNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/contacts');

        $this->assertResponseStatusCodeSame(401);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
    }

    public function testListReturnsEmptyWithNoContacts(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $entityManager->persist($currentUser);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();
        $this->assertSame(['totals' => [], 'items' => []], $this->getJsonResponse());
    }

    public function testListReturnsPairwiseBalancesAndTotals(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $alice = UserFactory::createUser('alice@example.com');
        $bob = UserFactory::createUser('bob@example.com');
        $carol = UserFactory::createUser('carol@example.com');
        $coDebtor = UserFactory::createUser('codebtor@example.com');
        foreach ([$currentUser, $alice, $bob, $carol, $coDebtor] as $user) {
            $entityManager->persist($user);
        }

        // I paid 90 split three ways with alice and bob: each owes me 30
        $this->createExpense($currentUser, '90.00', [$currentUser, $alice, $bob], ['30.00', '30.00', '30.00']);
        // alice paid 40 for me and the co-debtor: I owe alice 20, co-debtor owes me nothing
        $this->createExpense($alice, '40.00', [$currentUser, $coDebtor], ['20.00', '20.00']);
        // bob paid me back 30 in full
        $entityManager->persist(new Transfer($bob, $currentUser, '30.00', new \DateTimeImmutable('2026-01-02')));
        // I sent carol 15 with no expense: carol now owes me 15
        $entityManager->persist(new Transfer($currentUser, $carol, '15.00', new \DateTimeImmutable('2026-01-03')));
        // a EUR expense with alice
        $this->createExpense($alice, '10.00', [$currentUser], ['10.00'], 'EUR');

        $entityManager->flush();

        $client->loginUser($currentUser);
        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();
        $this->assertJsonStructure(['totals', 'items' => [0 => self::ITEM_STRUCTURE]]);

        $response = $this->getJsonResponse();
        $this->assertSame(
            ['alice@example.com', 'bob@example.com', 'carol@example.com'],
            array_map(static fn (array $item): string => $item['person']['email'], $response['items'])
        );

        $this->assertSame(
            [['currency' => 'EUR', 'amount' => '-10.00'], ['currency' => 'PLN', 'amount' => '10.00']],
            $response['items'][0]['balances']
        );
        $this->assertSame([], $response['items'][1]['balances']);
        $this->assertSame([['currency' => 'PLN', 'amount' => '15.00']], $response['items'][2]['balances']);

        $this->assertSame(
            [['currency' => 'EUR', 'amount' => '-10.00'], ['currency' => 'PLN', 'amount' => '25.00']],
            $response['totals']
        );
    }

    public function testListReturnsLatestExpenseOrTransferAsLastActivity(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $alice = UserFactory::createUser('alice@example.com');
        $bob = UserFactory::createUser('bob@example.com');
        $carol = UserFactory::createUser('carol@example.com');
        $coDebtor = UserFactory::createUser('codebtor@example.com');
        $dave = UserFactory::createUser('dave@example.com');
        foreach ([$currentUser, $alice, $bob, $carol, $coDebtor, $dave] as $user) {
            $entityManager->persist($user);
        }

        $aliceExpense = $this->createExpense($currentUser, '20.00', [$alice], ['20.00']);
        $aliceTransfer = new Transfer($alice, $currentUser, '20.00', new \DateTimeImmutable('2026-01-02'));
        $bobExpense = $this->createExpense($bob, '20.00', [$currentUser], ['20.00']);
        $bobTransfer = new Transfer($currentUser, $bob, '20.00', new \DateTimeImmutable('2026-01-02'));
        $carolExpense = $this->createExpense($currentUser, '20.00', [$carol], ['20.00']);
        $carolTransfer = new Transfer($carol, $currentUser, '10.00', new \DateTimeImmutable('2026-01-02'));
        $coDebtorExpense = $this->createExpense($currentUser, '20.00', [$coDebtor], ['20.00']);
        // dave paid for me and the co-debtor: that expense is not activity between us
        $sharedExpense = $this->createExpense($dave, '40.00', [$currentUser, $coDebtor], ['20.00', '20.00']);
        foreach ([$aliceTransfer, $bobTransfer, $carolTransfer] as $transfer) {
            $entityManager->persist($transfer);
        }
        $entityManager->flush();

        $this->setCreatedAt($aliceExpense, '2026-03-01 10:00:00');
        $this->setCreatedAt($aliceTransfer, '2026-04-01 10:00:00');
        $this->setCreatedAt($bobExpense, '2026-02-01 10:00:00');
        $this->setCreatedAt($bobTransfer, '2026-05-01 10:00:00');
        $this->setCreatedAt($carolExpense, '2026-06-01 10:00:00');
        $this->setCreatedAt($carolTransfer, '2026-01-15 10:00:00');
        $this->setCreatedAt($coDebtorExpense, '2026-01-20 10:00:00');
        $this->setCreatedAt($sharedExpense, '2026-07-01 10:00:00');

        $client->loginUser($currentUser);
        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();

        $lastActivity = $this->getLastActivityByEmail();
        $this->assertEquals(new \DateTimeImmutable('2026-04-01 10:00:00'), $lastActivity['alice@example.com']);
        $this->assertEquals(new \DateTimeImmutable('2026-05-01 10:00:00'), $lastActivity['bob@example.com']);
        $this->assertEquals(new \DateTimeImmutable('2026-06-01 10:00:00'), $lastActivity['carol@example.com']);
        $this->assertEquals(new \DateTimeImmutable('2026-01-20 10:00:00'), $lastActivity['codebtor@example.com']);
        $this->assertEquals(new \DateTimeImmutable('2026-07-01 10:00:00'), $lastActivity['dave@example.com']);
    }

    public function testListCountsContactCreationAsLastActivity(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $carol = UserFactory::createUser('carol@example.com');
        $dave = UserFactory::createUser('dave@example.com', null);
        foreach ([$currentUser, $carol, $dave] as $user) {
            $entityManager->persist($user);
        }

        $carolExpense = $this->createExpense($currentUser, '20.00', [$carol], ['20.00']);
        $carolContact = new Contact($currentUser, $carol);
        $daveContact = new Contact($currentUser, $dave);
        $entityManager->persist($carolContact);
        $entityManager->persist($daveContact);
        $entityManager->flush();

        $this->setCreatedAt($carolExpense, '2026-01-10 10:00:00');
        $this->setCreatedAt($carolContact, '2026-06-01 10:00:00');
        $this->setCreatedAt($daveContact, '2026-02-02 10:00:00');

        $client->loginUser($currentUser);
        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();

        $lastActivity = $this->getLastActivityByEmail();
        $this->assertEquals(new \DateTimeImmutable('2026-06-01 10:00:00'), $lastActivity['carol@example.com']);
        $this->assertEquals(new \DateTimeImmutable('2026-02-02 10:00:00'), $lastActivity['dave@example.com']);
    }

    public function testExpenseEditDoesNotMoveLastActivity(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $alice = UserFactory::createUser('alice@example.com');
        $entityManager->persist($currentUser);
        $entityManager->persist($alice);

        $expense = $this->createExpense($currentUser, '20.00', [$alice], ['20.00']);
        $entityManager->flush();
        $this->setCreatedAt($expense, '2026-03-01 10:00:00');

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', sprintf('/api/expenses/%d', $expense->getId()), [
            'title' => 'Edited',
            'description' => '',
            'amount' => '30.00',
            'payeeId' => $currentUser->getId(),
            'occurredOn' => '2026-01-15',
            'debts' => [
                ['payerId' => $alice->getId(), 'value' => '30.00'],
            ],
        ]);
        $this->assertJsonResponseIsSuccessful();

        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();
        $this->assertEquals(new \DateTimeImmutable('2026-03-01 10:00:00'), $this->getLastActivityByEmail()['alice@example.com']);
    }

    public function testUpdateReturnsLastActivityAndNicknameEditDoesNotMoveIt(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $friend = UserFactory::createUser('friend@example.com', null);
        $contact = new Contact($currentUser, $friend);
        $entityManager->persist($currentUser);
        $entityManager->persist($friend);
        $entityManager->persist($contact);
        $entityManager->flush();
        $this->setCreatedAt($contact, '2026-02-02 10:00:00');

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', sprintf('/api/contacts/%d', $friend->getId()), ['nickname' => 'Grandma']);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertEquals(new \DateTimeImmutable('2026-02-02 10:00:00'), new \DateTimeImmutable($this->getJsonResponse()['lastActivityAt']));
    }

    public function testListMirrorsBalanceForCounterpart(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $alice = UserFactory::createUser('alice@example.com');
        $entityManager->persist($currentUser);
        $entityManager->persist($alice);

        $this->createExpense($currentUser, '50.00', [$alice], ['50.00']);
        $entityManager->flush();

        $client->loginUser($alice);
        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();
        $response = $this->getJsonResponse();
        $this->assertSame([['currency' => 'PLN', 'amount' => '-50.00']], $response['items'][0]['balances']);
        $this->assertSame([['currency' => 'PLN', 'amount' => '-50.00']], $response['totals']);
    }

    public function testListExcludesSelfDebt(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $entityManager->persist($currentUser);
        $this->createExpense($currentUser, '50.00', [$currentUser], ['50.00']);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();
        $this->assertSame(['totals' => [], 'items' => []], $this->getJsonResponse());
    }

    public function testListIncludesAddedContactsAndSortsByDisplayName(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $zed = UserFactory::createUser('aaa@example.com', null);
        $mike = UserFactory::createUser('mike@example.com')->setName('mike');
        $beth = UserFactory::createUser('zzz@example.com');
        foreach ([$currentUser, $zed, $mike, $beth] as $user) {
            $entityManager->persist($user);
        }

        $entityManager->persist(new Contact($currentUser, $zed, 'Zed'));
        $entityManager->persist(new Contact($currentUser, $beth, 'Beth'));
        $this->createExpense($mike, '10.00', [$currentUser], ['10.00']);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();
        $this->assertSame(
            ['Beth', 'mike', 'Zed'],
            array_map(static fn (array $item): string => $item['person']['displayName'], $this->getJsonResponse()['items'])
        );
    }

    public function testListDoesNotShowOtherOwnersNicknames(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $otherOwner = UserFactory::createUser('other@example.com');
        $friend = UserFactory::createUser('friend@example.com');
        foreach ([$currentUser, $otherOwner, $friend] as $user) {
            $entityManager->persist($user);
        }

        $entityManager->persist(new Contact($otherOwner, $friend, 'Secret'));
        $this->createExpense($friend, '10.00', [$currentUser], ['10.00']);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $client->request('GET', '/api/contacts');

        $this->assertJsonResponseIsSuccessful();
        $item = $this->getJsonResponse()['items'][0];
        $this->assertNull($item['nickname']);
        $this->assertSame('friend@example.com', $item['person']['displayName']);
    }

    public function testUpdateSetsNicknameForCounterpart(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $friend = UserFactory::createUser('friend@example.com');
        $entityManager->persist($currentUser);
        $entityManager->persist($friend);
        $this->createExpense($friend, '10.00', [$currentUser], ['10.00']);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', sprintf('/api/contacts/%d', $friend->getId()), ['nickname' => ' Buddy ']);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertJsonStructure(self::ITEM_STRUCTURE);

        $response = $this->getJsonResponse();
        $this->assertSame('Buddy', $response['nickname']);
        $this->assertSame('Buddy', $response['person']['displayName']);
        $this->assertSame([['currency' => 'PLN', 'amount' => '-10.00']], $response['balances']);
    }

    public function testUpdateClearsNickname(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $friend = UserFactory::createUser('friend@example.com');
        $entityManager->persist($currentUser);
        $entityManager->persist($friend);
        $entityManager->persist(new Contact($currentUser, $friend, 'Buddy'));
        $entityManager->flush();

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', sprintf('/api/contacts/%d', $friend->getId()), ['nickname' => '   ']);

        $this->assertJsonResponseIsSuccessful(200);

        $response = $this->getJsonResponse();
        $this->assertNull($response['nickname']);
        $this->assertSame('friend@example.com', $response['person']['displayName']);
    }

    public function testUpdateAllowsAddedContactWithoutSharedActivity(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $friend = UserFactory::createUser('friend@example.com', null);
        $entityManager->persist($currentUser);
        $entityManager->persist($friend);
        $entityManager->persist(new Contact($currentUser, $friend));
        $entityManager->flush();

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', sprintf('/api/contacts/%d', $friend->getId()), ['nickname' => 'Grandma']);

        $this->assertJsonResponseIsSuccessful(200);

        $response = $this->getJsonResponse();
        $this->assertSame('Grandma', $response['nickname']);
        $this->assertSame([], $response['balances']);
    }

    public function testUpdateReturnsNotFoundForUnrelatedUser(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $stranger = UserFactory::createUser('stranger@example.com');
        $entityManager->persist($currentUser);
        $entityManager->persist($stranger);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', sprintf('/api/contacts/%d', $stranger->getId()), ['nickname' => 'Hi']);

        $this->assertResponseStatusCodeSame(404);
        $this->assertNull($this->findContact($currentUser, $stranger));
    }

    public function testUpdateReturnsNotFoundForUnknownUser(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $entityManager->persist($currentUser);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', '/api/contacts/99999999', ['nickname' => 'Hi']);

        $this->assertResponseStatusCodeSame(404);
    }

    public function testUpdateRejectsSelf(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $entityManager->persist($currentUser);
        $entityManager->flush();

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', sprintf('/api/contacts/%d', $currentUser->getId()), ['nickname' => 'Me']);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testUpdateRejectsTooLongNickname(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $currentUser = UserFactory::createUser('me@example.com');
        $friend = UserFactory::createUser('friend@example.com');
        $entityManager->persist($currentUser);
        $entityManager->persist($friend);
        $entityManager->persist(new Contact($currentUser, $friend));
        $entityManager->flush();

        $client->loginUser($currentUser);
        $this->requestJson($client, 'PUT', sprintf('/api/contacts/%d', $friend->getId()), ['nickname' => str_repeat('a', 65)]);

        $this->assertResponseStatusCodeSame(400);
    }

    private function getEntityManager(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function findContact(User $owner, User $user): ?Contact
    {
        return $this->getEntityManager()->getRepository(Contact::class)->findOneBy(['owner' => $owner, 'user' => $user]);
    }

    private function setCreatedAt(Expense|Transfer|Contact $entity, string $createdAt): void
    {
        $this->getEntityManager()->createQueryBuilder()
            ->update($entity::class, 'entity')
            ->set('entity.createdAt', ':createdAt')
            ->where('entity.id = :id')
            ->setParameter('createdAt', new \DateTimeImmutable($createdAt), 'datetime_immutable')
            ->setParameter('id', $entity->getId())
            ->getQuery()
            ->execute();

        $this->getEntityManager()->clear();
    }

    /**
     * @return array<string, \DateTimeImmutable>
     */
    private function getLastActivityByEmail(): array
    {
        $lastActivity = [];
        foreach ($this->getJsonResponse()['items'] as $item) {
            $lastActivity[$item['person']['email']] = new \DateTimeImmutable($item['lastActivityAt']);
        }

        return $lastActivity;
    }

    /**
     * @param list<User>   $debtors
     * @param list<string> $debtAmounts
     */
    private function createExpense(User $payee, string $amount, array $debtors, array $debtAmounts, string $currency = 'PLN'): Expense
    {
        $entityManager = $this->getEntityManager();

        $expense = new Expense($payee, 'Expense', null, $amount, new \DateTimeImmutable('2026-01-01'), $currency);
        $entityManager->persist($expense);

        foreach ($debtors as $index => $debtor) {
            $debt = new Debt($debtor, $expense, $debtAmounts[$index], $currency);
            $expense->addDebt($debt);
            $entityManager->persist($debt);
        }

        return $expense;
    }
}
