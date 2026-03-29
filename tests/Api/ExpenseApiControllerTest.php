<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;

class ExpenseApiControllerTest extends ApiTestCase
{
    public function testCreateNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/expenses');

        $this->assertResponseRedirects('/login');
    }

    public function testCreateSuccess(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $creator = UserFactory::createUser();
        $entityManager->persist($creator);

        $otherUser = UserFactory::createUser();
        $entityManager->persist($otherUser);

        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/expenses', [
            'title' => 'Dinner',
            'description' => 'Friday dinner',
            'amount' => '100.00',
            'payeeId' => $creator->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $otherUser->getId(), 'amount' => '70.00'],
                ['payerId' => $creator->getId(), 'amount' => '30.00'],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(201);
        $this->assertJsonStructure(['id', 'title', 'description', 'amount', 'payeeId', 'occurredOn']);

        $response = $this->getJsonResponse();
        $this->assertSame('Dinner', $response['title']);
        $this->assertSame('Friday dinner', $response['description']);
        $this->assertSame('100.00', $response['amount']);
        $this->assertSame($creator->getId(), $response['payeeId']);
        $this->assertStringStartsWith('2026-01-01', $response['occurredOn']);

        $entityManager->clear();
        $expenseRepository = $entityManager->getRepository(Expense::class);

        /** @var Expense|null $expense */
        $expense = $expenseRepository->find($response['id']);

        $this->assertInstanceOf(Expense::class, $expense);
        $this->assertSame($response['title'], $expense->getTitle());
        $this->assertSame($response['description'], $expense->getDescription());
        $this->assertSame($response['amount'], $expense->getAmount());
        $this->assertSame($creator->getId(), $expense->getPayee()->getId());
        $this->assertSame('2026-01-01', $expense->getOccurredOn()->format('Y-m-d'));

        $debts = $expense->getDebts();
        $this->assertCount(2, $debts);

        $debtsByPayerId = [];
        foreach ($debts as $debt) {
            $debtsByPayerId[$debt->getPayer()->getId()] = $debt->getAmount();
        }

        $expectedDebts = [
            $otherUser->getId() => '70.00',
            $creator->getId() => '30.00',
        ];

        $this->assertSame($expectedDebts, $debtsByPayerId);
    }

    public function testCreateSuccessWhenNoDescription(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $creator = UserFactory::createUser();
        $entityManager->persist($creator);

        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/expenses', [
            'title' => 'Dinner',
            'amount' => '100.00',
            'payeeId' => $creator->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $creator->getId(), 'amount' => '100.00'],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(201);

        $response = $this->getJsonResponse();
        $this->assertNull($response['description']);
    }

    public function testCreateFailsWhenDebtsSumDoesNotMatchAmount(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $creator = UserFactory::createUser();
        $entityManager->persist($creator);

        $otherUser = UserFactory::createUser();
        $entityManager->persist($otherUser);

        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/expenses', [
            'title' => 'Dinner',
            'description' => 'Friday dinner',
            'amount' => '100.00',
            'payeeId' => $creator->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $otherUser->getId(), 'amount' => '60.00'],
                ['payerId' => $creator->getId(), 'amount' => '30.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testCreateFailsWhenUserDoesNotExist(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $creator = UserFactory::createUser();
        $entityManager->persist($creator);
        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/expenses', [
            'title' => 'Dinner',
            'description' => 'Friday dinner',
            'amount' => '100.00',
            'payeeId' => 999999,
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $creator->getId(), 'amount' => '100.00'],
            ],
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

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $debtor = UserFactory::createUser();
        $entityManager->persist($debtor);

        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/expenses', [
            'title' => 'Dinner',
            'description' => 'Friday dinner',
            'amount' => '100.00',
            'payeeId' => $payee->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $debtor->getId(), 'amount' => '100.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    public function testCreateFailsValidationForNonPositiveAmounts(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $creator = UserFactory::createUser();
        $entityManager->persist($creator);
        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/expenses', [
            'title' => 'Dinner',
            'description' => 'Friday dinner',
            'amount' => '0.00',
            'payeeId' => $creator->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $creator->getId(), 'amount' => '-1.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testUpdateNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('PUT', '/api/expenses/1');

        $this->assertResponseRedirects('/login');
    }

    public function testUpdateSuccess(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $editor = UserFactory::createUser();
        $entityManager->persist($editor);

        $otherUser = UserFactory::createUser();
        $entityManager->persist($otherUser);

        $newPayer = UserFactory::createUser();
        $entityManager->persist($newPayer);

        $expense = new Expense($editor, 'Old title', 'Old description', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);

        $oldDebt = new Debt($otherUser, $expense, '100.00');
        $entityManager->persist($oldDebt);

        $entityManager->flush();

        $client->loginUser($editor);

        $this->requestJson($client, 'PUT', sprintf('/api/expenses/%d', $expense->getId()), [
            'title' => 'Updated dinner',
            'description' => '',
            'amount' => '120.00',
            'payeeId' => $otherUser->getId(),
            'occurredOn' => '2026-01-15',
            'debts' => [
                ['payerId' => $editor->getId(), 'amount' => '60.00'],
                ['payerId' => $newPayer->getId(), 'amount' => '60.00'],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertJsonStructure(['id', 'title', 'description', 'amount', 'payeeId', 'occurredOn']);

        $response = $this->getJsonResponse();
        $this->assertSame($expense->getId(), $response['id']);
        $this->assertSame('Updated dinner', $response['title']);
        $this->assertSame('', $response['description']);
        $this->assertSame('120.00', $response['amount']);
        $this->assertSame($otherUser->getId(), $response['payeeId']);
        $this->assertStringStartsWith('2026-01-15', $response['occurredOn']);

        $entityManager->clear();
        $expenseRepository = $entityManager->getRepository(Expense::class);

        /** @var Expense|null $updatedExpense */
        $updatedExpense = $expenseRepository->find($response['id']);
        $this->assertInstanceOf(Expense::class, $updatedExpense);
        $this->assertSame('Updated dinner', $updatedExpense->getTitle());
        $this->assertSame('', $updatedExpense->getDescription());
        $this->assertSame('120.00', $updatedExpense->getAmount());
        $this->assertSame($otherUser->getId(), $updatedExpense->getPayee()->getId());
        $this->assertSame('2026-01-15', $updatedExpense->getOccurredOn()->format('Y-m-d'));

        $debtsByPayerId = [];
        foreach ($updatedExpense->getDebts() as $debt) {
            $debtsByPayerId[$debt->getPayer()->getId()] = $debt->getAmount();
        }

        $this->assertSame([
            $editor->getId() => '60.00',
            $newPayer->getId() => '60.00',
        ], $debtsByPayerId);
    }

    public function testUpdateSuccessWhenNoDescription(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $editor = UserFactory::createUser();
        $entityManager->persist($editor);

        $expense = new Expense($editor, 'Dinner', null, '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($editor, $expense, '100.00'));

        $entityManager->flush();

        $client->loginUser($editor);

        $this->requestJson($client, 'PUT', sprintf('/api/expenses/%d', $expense->getId()), [
            'title' => 'Updated dinner',
            'amount' => '100.00',
            'payeeId' => $editor->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $editor->getId(), 'amount' => '100.00'],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(200);

        $response = $this->getJsonResponse();
        $this->assertNull($response['description']);
    }

    public function testUpdateFailsWhenExpenseDoesNotExist(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);

        $this->requestJson($client, 'PUT', '/api/expenses/999999', [
            'title' => 'Updated dinner',
            'description' => 'Friday dinner',
            'amount' => '100.00',
            'payeeId' => $user->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $user->getId(), 'amount' => '100.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(404);
    }

    public function testUpdateFailsWhenEditorIsNotInvolvedInExistingExpense(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $editor = UserFactory::createUser();
        $entityManager->persist($editor);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $debtor = UserFactory::createUser();
        $entityManager->persist($debtor);

        $expense = new Expense($payee, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($debtor, $expense, '100.00'));

        $entityManager->flush();

        $client->loginUser($editor);

        $this->requestJson($client, 'PUT', sprintf('/api/expenses/%d', $expense->getId()), [
            'title' => 'Updated dinner',
            'description' => 'Updated description',
            'amount' => '100.00',
            'payeeId' => $payee->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $debtor->getId(), 'amount' => '100.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(403);
    }

    public function testUpdateFailsWhenDebtUserDoesNotExist(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $editor = UserFactory::createUser();
        $entityManager->persist($editor);

        $expense = new Expense($editor, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($editor, $expense, '100.00'));

        $entityManager->flush();

        $client->loginUser($editor);

        $this->requestJson($client, 'PUT', sprintf('/api/expenses/%d', $expense->getId()), [
            'title' => 'Updated dinner',
            'description' => 'Updated description',
            'amount' => '100.00',
            'payeeId' => $editor->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => 999999, 'amount' => '100.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    public function testUpdateFailsWhenDebtsSumDoesNotMatchAmount(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $editor = UserFactory::createUser();
        $entityManager->persist($editor);

        $otherUser = UserFactory::createUser();
        $entityManager->persist($otherUser);

        $expense = new Expense($editor, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($otherUser, $expense, '100.00'));

        $entityManager->flush();

        $client->loginUser($editor);

        $this->requestJson($client, 'PUT', sprintf('/api/expenses/%d', $expense->getId()), [
            'title' => 'Updated dinner',
            'description' => 'Updated description',
            'amount' => '100.00',
            'payeeId' => $editor->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $editor->getId(), 'amount' => '40.00'],
                ['payerId' => $otherUser->getId(), 'amount' => '40.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testUpdateFailsWhenEditorIsNotInvolvedInNewState(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $editor = UserFactory::createUser();
        $entityManager->persist($editor);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $debtor = UserFactory::createUser();
        $entityManager->persist($debtor);

        $expense = new Expense($editor, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($debtor, $expense, '100.00'));

        $entityManager->flush();

        $client->loginUser($editor);

        $this->requestJson($client, 'PUT', sprintf('/api/expenses/%d', $expense->getId()), [
            'title' => 'Updated dinner',
            'description' => 'Updated description',
            'amount' => '100.00',
            'payeeId' => $payee->getId(),
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $debtor->getId(), 'amount' => '100.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    public function testUpdateFailsWhenPayeeDoesNotExist(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $editor = UserFactory::createUser();
        $entityManager->persist($editor);

        $expense = new Expense($editor, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($editor, $expense, '100.00'));

        $entityManager->flush();

        $client->loginUser($editor);

        $this->requestJson($client, 'PUT', sprintf('/api/expenses/%d', $expense->getId()), [
            'title' => 'Updated dinner',
            'description' => 'Updated description',
            'amount' => '100.00',
            'payeeId' => 999999,
            'occurredOn' => '2026-01-01',
            'debts' => [
                ['payerId' => $editor->getId(), 'amount' => '100.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    public function testListNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/expenses');

        $this->assertResponseRedirects('/login');
    }

    public function testListPagination(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);

        $otherUser = UserFactory::createUser();
        $entityManager->persist($otherUser);

        // Create 5 expenses where user is payee (Expense 1-5, each on a distinct date)
        for ($index = 1; $index <= 5; ++$index) {
            $expense = new Expense(
                $user,
                "Expense $index",
                "Description for expense $index",
                '100.00',
                new \DateTimeImmutable("2026-01-0$index"),
            );
            $entityManager->persist($expense);

            $debt = new Debt($otherUser, $expense, '100.00');
            $entityManager->persist($debt);
        }

        // Add 3 more expenses where user is a debtor (Expense 6-8, each on a distinct date)
        for ($index = 6; $index <= 8; ++$index) {
            $expense = new Expense(
                $otherUser,
                "Expense $index",
                "Description for expense $index",
                '100.00',
                new \DateTimeImmutable("2026-01-$index"),
            );
            $entityManager->persist($expense);

            $debt = new Debt($user, $expense, '100.00');
            $entityManager->persist($debt);
        }

        // Add an expense that user is NOT involved in (should not appear in results)
        $irrelevantExpense = new Expense(
            $otherUser,
            'Irrelevant Expense',
            'User is not involved',
            '100.00',
            new \DateTimeImmutable('2026-01-09'),
        );
        $entityManager->persist($irrelevantExpense);

        $entityManager->flush();

        $client->loginUser($user);

        // First page with limit 5
        $client->request('GET', '/api/expenses', ['limit' => 5, 'offset' => 0]);
        $this->assertJsonResponseIsSuccessful();

        $firstPage = $this->getJsonResponse();
        $this->assertCount(5, $firstPage);

        // Verify order (DESC by occurredOn, so most recent first)
        $this->assertSame('Expense 8', $firstPage[0]['title']);
        $this->assertSame('Expense 7', $firstPage[1]['title']);
        $this->assertSame('Expense 6', $firstPage[2]['title']);
        $this->assertSame('Expense 5', $firstPage[3]['title']);
        $this->assertSame('Expense 4', $firstPage[4]['title']);

        // Second page with limit 5, offset 5
        $client->request('GET', '/api/expenses', ['limit' => 5, 'offset' => 5]);
        $this->assertJsonResponseIsSuccessful();

        $secondPage = $this->getJsonResponse();
        $this->assertCount(3, $secondPage);

        // Verify order continues
        $this->assertSame('Expense 3', $secondPage[0]['title']);
        $this->assertSame('Expense 2', $secondPage[1]['title']);
        $this->assertSame('Expense 1', $secondPage[2]['title']);
    }

    public function testListStructure(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);

        $otherUser = UserFactory::createUser();
        $entityManager->persist($otherUser);

        $expense = new Expense($user, 'Test Expense', 'Test Description', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);

        $debt = new Debt($otherUser, $expense, '100.00');
        $entityManager->persist($debt);

        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/expenses');

        $this->assertJsonResponseIsSuccessful();
        $this->assertJsonStructure([
            0 => ['id', 'title', 'description', 'payeeEmail', 'value', 'occurredOn'],
        ]);

        $response = $this->getJsonResponse();
        $this->assertSame('Test Expense', $response[0]['title']);
        $this->assertSame('Test Description', $response[0]['description']);
        $this->assertSame($user->getEmail(), $response[0]['payeeEmail']);
        $this->assertSame('100.00', $response[0]['value']);
        $this->assertStringStartsWith('2026-01-01', $response[0]['occurredOn']);
    }
}
