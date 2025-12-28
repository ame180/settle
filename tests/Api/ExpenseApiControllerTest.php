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

        // Create 8 expenses where user participates (as payee or debtor)
        $expenses = [];
        for ($index = 1; $index <= 5; ++$index) {
            $expense = new Expense(
                $user,
                "Expense $index",
                "Description for expense $index",
                '100.00'
            );
            $entityManager->persist($expense);

            $debt = new Debt($otherUser, $expense, '100.00');
            $entityManager->persist($debt);

            $expenses[] = $expense;
        }

        // Add 3 more expenses where user is a debtor
        for ($index = 6; $index <= 8; ++$index) {
            $expense = new Expense(
                $otherUser,
                "Expense $index",
                "Description for expense $index",
                '100.00'
            );
            $entityManager->persist($expense);

            $debt = new Debt($user, $expense, '100.00');
            $entityManager->persist($debt);

            $expenses[] = $expense;
        }

        // Add an expense that user is NOT involved in (should not appear in results)
        $irrelevantExpense = new Expense(
            $otherUser,
            'Irrelevant Expense',
            'User is not involved',
            '100.00'
        );
        $entityManager->persist($irrelevantExpense);

        $entityManager->flush();

        $client->loginUser($user);

        // First page with limit 5
        $client->request('GET', '/api/expenses', ['limit' => 5, 'offset' => 0]);
        $this->assertJsonResponseIsSuccessful();

        $firstPage = $this->getJsonResponse();
        $this->assertCount(5, $firstPage);

        // Verify order (DESC by ID, so most recent first)
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

        $expense = new Expense($user, 'Test Expense', 'Test Description', '100.00');
        $entityManager->persist($expense);

        $debt = new Debt($otherUser, $expense, '100.00');
        $entityManager->persist($debt);

        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/expenses');

        $this->assertJsonResponseIsSuccessful();
        $this->assertJsonStructure([
            0 => ['id', 'title', 'description', 'payeeEmail', 'value'],
        ]);

        $response = $this->getJsonResponse();
        $this->assertSame('Test Expense', $response[0]['title']);
        $this->assertSame('Test Description', $response[0]['description']);
        $this->assertSame($user->getEmail(), $response[0]['payeeEmail']);
        $this->assertSame('100.00', $response[0]['value']);
    }
}
