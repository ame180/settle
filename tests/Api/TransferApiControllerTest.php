<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Transfer;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;

class TransferApiControllerTest extends ApiTestCase
{
    public function testCreateNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/transfers');

        $this->assertResponseRedirects('/login');
    }

    public function testCreateSuccess(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $entityManager->flush();

        $client->loginUser($payer);

        $this->requestJson($client, 'POST', '/api/transfers', [
            'payerId' => $payer->getId(),
            'payeeId' => $payee->getId(),
            'amount' => '25.00',
            'occurredOn' => '2026-01-01',
            'description' => 'Cash repayment',
        ]);

        $this->assertJsonResponseIsSuccessful(201);
        $this->assertJsonStructure(['id', 'payerId', 'payeeId', 'amount', 'currency', 'occurredOn', 'description']);

        $response = $this->getJsonResponse();
        $this->assertSame($payer->getId(), $response['payerId']);
        $this->assertSame($payee->getId(), $response['payeeId']);
        $this->assertSame('25.00', $response['amount']);
        $this->assertSame('PLN', $response['currency']);
        $this->assertSame('Cash repayment', $response['description']);
        $this->assertStringStartsWith('2026-01-01', $response['occurredOn']);

        $entityManager->clear();

        /** @var Transfer|null $transfer */
        $transfer = $entityManager->getRepository(Transfer::class)->find($response['id']);

        $this->assertInstanceOf(Transfer::class, $transfer);
        $this->assertSame($payer->getId(), $transfer->getPayer()->getId());
        $this->assertSame($payee->getId(), $transfer->getPayee()->getId());
        $this->assertSame('25.00', $transfer->getAmount());
        $this->assertSame('2026-01-01', $transfer->getOccurredOn()->format('Y-m-d'));
    }

    public function testCreateSuccessWhenNoDescription(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $entityManager->flush();

        $client->loginUser($payer);

        $this->requestJson($client, 'POST', '/api/transfers', [
            'payerId' => $payer->getId(),
            'payeeId' => $payee->getId(),
            'amount' => '25.00',
            'occurredOn' => '2026-01-01',
        ]);

        $this->assertJsonResponseIsSuccessful(201);

        $response = $this->getJsonResponse();
        $this->assertNull($response['description']);
    }

    public function testCreateFailsWhenPayerEqualsPayee(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);

        $this->requestJson($client, 'POST', '/api/transfers', [
            'payerId' => $user->getId(),
            'payeeId' => $user->getId(),
            'amount' => '25.00',
            'occurredOn' => '2026-01-01',
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testCreateFailsWhenAmountIsNotPositive(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $entityManager->flush();

        $client->loginUser($payer);

        $this->requestJson($client, 'POST', '/api/transfers', [
            'payerId' => $payer->getId(),
            'payeeId' => $payee->getId(),
            'amount' => '0.00',
            'occurredOn' => '2026-01-01',
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testCreateFailsWhenUserDoesNotExist(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);
        $entityManager->flush();

        $client->loginUser($payer);

        $this->requestJson($client, 'POST', '/api/transfers', [
            'payerId' => $payer->getId(),
            'payeeId' => 999999,
            'amount' => '25.00',
            'occurredOn' => '2026-01-01',
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    public function testCreateFailsWhenCreatorIsNotInvolved(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $creator = UserFactory::createUser();
        $entityManager->persist($creator);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/transfers', [
            'payerId' => $payer->getId(),
            'payeeId' => $payee->getId(),
            'amount' => '25.00',
            'occurredOn' => '2026-01-01',
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    public function testUpdateSuccess(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $transfer = new Transfer($payer, $payee, '25.00', new \DateTimeImmutable('2026-01-01'), 'Cash');
        $entityManager->persist($transfer);

        $entityManager->flush();
        $transferId = $transfer->getId();
        $payerId = $payer->getId();
        $payeeId = $payee->getId();

        $client->loginUser($payee);

        $this->requestJson($client, 'PUT', sprintf('/api/transfers/%d', $transferId), [
            'amount' => '30.00',
            'occurredOn' => '2026-02-02',
            'description' => 'Bank transfer',
        ]);

        $this->assertJsonResponseIsSuccessful(200);

        $response = $this->getJsonResponse();
        $this->assertSame('30.00', $response['amount']);
        $this->assertSame('Bank transfer', $response['description']);
        $this->assertStringStartsWith('2026-02-02', $response['occurredOn']);
        // Parties are not changeable through update.
        $this->assertSame($payerId, $response['payerId']);
        $this->assertSame($payeeId, $response['payeeId']);

        $entityManager->clear();

        /** @var Transfer|null $updated */
        $updated = $entityManager->getRepository(Transfer::class)->find($transferId);
        $this->assertInstanceOf(Transfer::class, $updated);
        $this->assertSame('30.00', $updated->getAmount());
        $this->assertSame('2026-02-02', $updated->getOccurredOn()->format('Y-m-d'));
    }

    public function testUpdateForbiddenWhenNotInvolved(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $outsider = UserFactory::createUser();
        $entityManager->persist($outsider);

        $transfer = new Transfer($payer, $payee, '25.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($transfer);

        $entityManager->flush();
        $transferId = $transfer->getId();

        $client->loginUser($outsider);

        $this->requestJson($client, 'PUT', sprintf('/api/transfers/%d', $transferId), [
            'amount' => '30.00',
            'occurredOn' => '2026-02-02',
        ]);

        $this->assertResponseStatusCodeSame(403);
    }

    public function testUpdateNotFound(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);

        $this->requestJson($client, 'PUT', '/api/transfers/999999', [
            'amount' => '30.00',
            'occurredOn' => '2026-02-02',
        ]);

        $this->assertResponseStatusCodeSame(404);
    }

    public function testDeleteSuccess(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $transfer = new Transfer($payer, $payee, '25.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($transfer);

        $entityManager->flush();
        $transferId = $transfer->getId();

        $client->loginUser($payer);

        $client->request('DELETE', sprintf('/api/transfers/%d', $transferId));

        $this->assertResponseStatusCodeSame(204);

        $entityManager->clear();
        $this->assertNull($entityManager->getRepository(Transfer::class)->find($transferId));
    }

    public function testDeleteForbiddenWhenNotInvolved(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payer = UserFactory::createUser();
        $entityManager->persist($payer);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $outsider = UserFactory::createUser();
        $entityManager->persist($outsider);

        $transfer = new Transfer($payer, $payee, '25.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($transfer);

        $entityManager->flush();
        $transferId = $transfer->getId();

        $client->loginUser($outsider);

        $client->request('DELETE', sprintf('/api/transfers/%d', $transferId));

        $this->assertResponseStatusCodeSame(403);
    }

    public function testDeleteNotFound(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);

        $client->request('DELETE', '/api/transfers/999999');

        $this->assertResponseStatusCodeSame(404);
    }
}
