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
                ['payerId' => $otherUser->getId(), 'value' => '70.00'],
                ['payerId' => $creator->getId(), 'value' => '30.00'],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(201);
        $this->assertJsonStructure(['id', 'title', 'description', 'amount', 'currency', 'payeeId', 'occurredOn']);

        $response = $this->getJsonResponse();
        $this->assertSame('Dinner', $response['title']);
        $this->assertSame('Friday dinner', $response['description']);
        $this->assertSame('100.00', $response['amount']);
        $this->assertSame('PLN', $response['currency']);
        $this->assertSame($creator->getId(), $response['payeeId']);
        $this->assertStringStartsWith('2026-01-01', $response['occurredOn']);
        $this->assertSame('exact', $response['splitType']);
        $this->assertCount(2, $response['debts']);
        $this->assertJsonStructure([0 => ['payerId', 'amount', 'splitValue']], $response['debts']);

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
                ['payerId' => $creator->getId(), 'value' => '100.00'],
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
                ['payerId' => $otherUser->getId(), 'value' => '60.00'],
                ['payerId' => $creator->getId(), 'value' => '30.00'],
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
                ['payerId' => $creator->getId(), 'value' => '100.00'],
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
                ['payerId' => $debtor->getId(), 'value' => '100.00'],
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
                ['payerId' => $creator->getId(), 'value' => '-1.00'],
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
                ['payerId' => $editor->getId(), 'value' => '60.00'],
                ['payerId' => $newPayer->getId(), 'value' => '60.00'],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertJsonStructure(['id', 'title', 'description', 'amount', 'currency', 'payeeId', 'occurredOn']);

        $response = $this->getJsonResponse();
        $this->assertSame($expense->getId(), $response['id']);
        $this->assertSame('Updated dinner', $response['title']);
        $this->assertSame('', $response['description']);
        $this->assertSame('120.00', $response['amount']);
        $this->assertSame('PLN', $response['currency']);
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
                ['payerId' => $editor->getId(), 'value' => '100.00'],
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
                ['payerId' => $user->getId(), 'value' => '100.00'],
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
                ['payerId' => $debtor->getId(), 'value' => '100.00'],
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
                ['payerId' => 999999, 'value' => '100.00'],
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
                ['payerId' => $editor->getId(), 'value' => '40.00'],
                ['payerId' => $otherUser->getId(), 'value' => '40.00'],
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
                ['payerId' => $debtor->getId(), 'value' => '100.00'],
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
                ['payerId' => $editor->getId(), 'value' => '100.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
    }

    public function testDeleteNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('DELETE', '/api/expenses/1');

        $this->assertResponseRedirects('/login');
    }

    public function testDeleteSuccess(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $debtor = UserFactory::createUser();
        $entityManager->persist($debtor);

        $expense = new Expense($payee, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($debtor, $expense, '100.00'));

        $entityManager->flush();
        $expenseId = $expense->getId();

        $client->loginUser($payee);

        $client->request('DELETE', sprintf('/api/expenses/%d', $expenseId));

        $this->assertResponseStatusCodeSame(204);

        $entityManager->clear();
        $this->assertNull($entityManager->getRepository(Expense::class)->find($expenseId));
        $this->assertCount(0, $entityManager->getRepository(Debt::class)->findBy(['expense' => $expenseId]));
    }

    public function testDeleteSuccessWhenDebtor(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $debtor = UserFactory::createUser();
        $entityManager->persist($debtor);

        $expense = new Expense($payee, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);

        $debt = new Debt($debtor, $expense, '100.00');
        $expense->addDebt($debt);
        $entityManager->persist($debt);

        $entityManager->flush();
        $expenseId = $expense->getId();

        $client->loginUser($debtor);

        $client->request('DELETE', sprintf('/api/expenses/%d', $expenseId));

        $this->assertResponseStatusCodeSame(204);

        $entityManager->clear();
        $this->assertNull($entityManager->getRepository(Expense::class)->find($expenseId));
    }

    public function testDeleteFailsWhenExpenseDoesNotExist(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);

        $client->request('DELETE', '/api/expenses/999999');

        $this->assertResponseStatusCodeSame(404);
    }

    public function testDeleteFailsWhenUserNotInvolved(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $debtor = UserFactory::createUser();
        $entityManager->persist($debtor);

        $outsider = UserFactory::createUser();
        $entityManager->persist($outsider);

        $expense = new Expense($payee, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($debtor, $expense, '100.00'));

        $entityManager->flush();

        $client->loginUser($outsider);

        $client->request('DELETE', sprintf('/api/expenses/%d', $expense->getId()));

        $this->assertResponseStatusCodeSame(403);
    }

    public function testCreateWithPercentageSplit(): void
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
            'amount' => '100.00',
            'payeeId' => $creator->getId(),
            'occurredOn' => '2026-01-01',
            'splitType' => 'percentage',
            'debts' => [
                ['payerId' => $creator->getId(), 'value' => '30.00'],
                ['payerId' => $otherUser->getId(), 'value' => '70.00'],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(201);

        $response = $this->getJsonResponse();
        $this->assertSame('percentage', $response['splitType']);

        $byPayer = $this->indexDebtsByPayer($response['debts']);
        $this->assertSame(['amount' => '30.00', 'splitValue' => '30.00'], $byPayer[$creator->getId()]);
        $this->assertSame(['amount' => '70.00', 'splitValue' => '70.00'], $byPayer[$otherUser->getId()]);
    }

    public function testCreateWithPercentageSplitFailsWhenNotHundred(): void
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
            'amount' => '100.00',
            'payeeId' => $creator->getId(),
            'occurredOn' => '2026-01-01',
            'splitType' => 'percentage',
            'debts' => [
                ['payerId' => $creator->getId(), 'value' => '30.00'],
                ['payerId' => $otherUser->getId(), 'value' => '60.00'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testCreateWithSharesSplitDistributesRemainder(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $creator = UserFactory::createUser();
        $entityManager->persist($creator);

        $second = UserFactory::createUser();
        $entityManager->persist($second);

        $third = UserFactory::createUser();
        $entityManager->persist($third);

        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/expenses', [
            'title' => 'Dinner',
            'amount' => '10.00',
            'payeeId' => $creator->getId(),
            'occurredOn' => '2026-01-01',
            'splitType' => 'shares',
            'debts' => [
                ['payerId' => $creator->getId(), 'value' => '1'],
                ['payerId' => $second->getId(), 'value' => '1'],
                ['payerId' => $third->getId(), 'value' => '1'],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(201);

        $response = $this->getJsonResponse();
        $this->assertSame('shares', $response['splitType']);

        $amounts = array_map(fn ($debt) => $debt['amount'], $response['debts']);
        sort($amounts);
        $this->assertSame(['3.33', '3.33', '3.34'], $amounts);

        $sum = array_reduce($response['debts'], fn ($carry, $debt) => bcadd($carry, $debt['amount'], 2), '0.00');
        $this->assertSame('10.00', $sum);
    }

    public function testCreateWithEqualSplitStoresNoSplitValue(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $creator = UserFactory::createUser();
        $entityManager->persist($creator);

        $second = UserFactory::createUser();
        $entityManager->persist($second);

        $third = UserFactory::createUser();
        $entityManager->persist($third);

        $entityManager->flush();

        $client->loginUser($creator);

        $this->requestJson($client, 'POST', '/api/expenses', [
            'title' => 'Dinner',
            'amount' => '10.00',
            'payeeId' => $creator->getId(),
            'occurredOn' => '2026-01-01',
            'splitType' => 'equal',
            'debts' => [
                ['payerId' => $creator->getId()],
                ['payerId' => $second->getId()],
                ['payerId' => $third->getId()],
            ],
        ]);

        $this->assertJsonResponseIsSuccessful(201);

        $response = $this->getJsonResponse();
        $this->assertSame('equal', $response['splitType']);

        foreach ($response['debts'] as $debt) {
            $this->assertNull($debt['splitValue']);
        }

        $amounts = array_map(fn ($debt) => $debt['amount'], $response['debts']);
        sort($amounts);
        $this->assertSame(['3.33', '3.33', '3.34'], $amounts);
    }

    public function testShowReturnsExpenseWithDebts(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $debtor = UserFactory::createUser();
        $entityManager->persist($debtor);

        $expense = new Expense($payee, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $debt = new Debt($debtor, $expense, '100.00');
        $expense->addDebt($debt);
        $entityManager->persist($debt);

        $entityManager->flush();

        $client->loginUser($payee);
        $client->request('GET', sprintf('/api/expenses/%d', $expense->getId()));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertJsonStructure([
            'id', 'title', 'description', 'amount', 'currency', 'payeeId', 'occurredOn', 'splitType',
            'debts' => [0 => ['payerId', 'amount', 'splitValue']],
        ]);

        $response = $this->getJsonResponse();
        $this->assertSame('Dinner', $response['title']);
        $this->assertSame('exact', $response['splitType']);
        $this->assertCount(1, $response['debts']);
        $this->assertSame($debtor->getId(), $response['debts'][0]['payerId']);
    }

    public function testShowFailsWhenExpenseDoesNotExist(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/expenses/999999');

        $this->assertResponseStatusCodeSame(404);
    }

    public function testShowFailsWhenUserIsNotInvolved(): void
    {
        $client = static::createClient();
        $container = static::getContainer();
        $entityManager = $container->get(EntityManagerInterface::class);

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);

        $debtor = UserFactory::createUser();
        $entityManager->persist($debtor);

        $outsider = UserFactory::createUser();
        $entityManager->persist($outsider);

        $expense = new Expense($payee, 'Dinner', 'Friday dinner', '100.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $entityManager->persist(new Debt($debtor, $expense, '100.00'));

        $entityManager->flush();

        $client->loginUser($outsider);
        $client->request('GET', sprintf('/api/expenses/%d', $expense->getId()));

        $this->assertResponseStatusCodeSame(403);
    }

    /**
     * @param list<array{payerId: int, amount: string, splitValue: ?string}> $debts
     *
     * @return array<int, array{amount: string, splitValue: ?string}>
     */
    private function indexDebtsByPayer(array $debts): array
    {
        $byPayer = [];
        foreach ($debts as $debt) {
            $byPayer[$debt['payerId']] = ['amount' => $debt['amount'], 'splitValue' => $debt['splitValue']];
        }

        return $byPayer;
    }
}
