<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\Transfer;
use App\Entity\User;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;

class ActivityApiControllerTest extends ApiTestCase
{
    public function testActivityNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/activity');

        $this->assertResponseRedirects('/login');
    }

    public function testActivityStructure(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $payee = UserFactory::createUser();
        $debtor = UserFactory::createUser();
        $entityManager->persist($payee);
        $entityManager->persist($debtor);

        $this->createExpense($payee, $debtor, '100.00', '2026-02-02', 'Dinner', 'Friday dinner');
        $this->createTransfer($debtor, $payee, '40.00', '2026-02-01', 'Partial repayment');

        $entityManager->flush();

        $client->loginUser($payee);
        $client->request('GET', '/api/activity');

        $this->assertJsonResponseIsSuccessful();
        $this->assertJsonStructure([
            0 => ['type', 'id', 'occurredOn', 'currency', 'amount', 'value', 'title', 'description', 'payeeId', 'payeeEmail', 'payerId', 'payerEmail'],
        ]);

        $response = $this->getJsonResponse();
        $this->assertCount(2, $response);

        $expenseItem = $response[0];
        $this->assertSame('expense', $expenseItem['type']);
        $this->assertSame('Dinner', $expenseItem['title']);
        $this->assertSame('Friday dinner', $expenseItem['description']);
        $this->assertSame('100.00', $expenseItem['amount']);
        $this->assertSame('PLN', $expenseItem['currency']);
        $this->assertSame($payee->getId(), $expenseItem['payeeId']);
        $this->assertSame($payee->getEmail(), $expenseItem['payeeEmail']);
        $this->assertNull($expenseItem['payerId']);
        $this->assertNull($expenseItem['payerEmail']);
        $this->assertStringStartsWith('2026-02-02', $expenseItem['occurredOn']);

        $transferItem = $response[1];
        $this->assertSame('transfer', $transferItem['type']);
        $this->assertSame('Partial repayment', $transferItem['title']);
        $this->assertNull($transferItem['description']);
        $this->assertSame('40.00', $transferItem['amount']);
        $this->assertSame($payee->getId(), $transferItem['payeeId']);
        $this->assertSame($payee->getEmail(), $transferItem['payeeEmail']);
        $this->assertSame($debtor->getId(), $transferItem['payerId']);
        $this->assertSame($debtor->getEmail(), $transferItem['payerEmail']);
    }

    public function testActivityInterleavesExpensesAndTransfersByOccurredOnDesc(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $user = UserFactory::createUser();
        $contact = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->persist($contact);

        $this->createExpense($user, $contact, '10.00', '2026-03-01', 'Expense 1');
        $this->createTransfer($contact, $user, '20.00', '2026-03-02', 'Transfer 2');
        $this->createExpense($contact, $user, '30.00', '2026-03-03', 'Expense 3');
        $this->createTransfer($user, $contact, '40.00', '2026-03-04', 'Transfer 4');

        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/activity');

        $this->assertJsonResponseIsSuccessful();

        $response = $this->getJsonResponse();
        $this->assertSame(
            [
                ['transfer', 'Transfer 4'],
                ['expense', 'Expense 3'],
                ['transfer', 'Transfer 2'],
                ['expense', 'Expense 1'],
            ],
            array_map(static fn (array $item): array => [$item['type'], $item['title']], $response)
        );
    }

    public function testActivityPaginatesExpensesAndTransfersAsOneList(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $user = UserFactory::createUser();
        $contact = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->persist($contact);

        $this->createExpense($user, $contact, '10.00', '2026-04-01', 'Item 1');
        $this->createTransfer($contact, $user, '20.00', '2026-04-02', 'Item 2');
        $this->createExpense($contact, $user, '30.00', '2026-04-03', 'Item 3');
        $this->createTransfer($user, $contact, '40.00', '2026-04-04', 'Item 4');
        $this->createExpense($user, $contact, '50.00', '2026-04-05', 'Item 5');

        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/activity', ['limit' => 2, 'offset' => 2]);

        $this->assertJsonResponseIsSuccessful();

        $response = $this->getJsonResponse();
        $this->assertCount(2, $response);
        $this->assertSame('Item 3', $response[0]['title']);
        $this->assertSame('expense', $response[0]['type']);
        $this->assertSame('Item 2', $response[1]['title']);
        $this->assertSame('transfer', $response[1]['type']);
    }

    public function testActivityRejectsOutOfRangePagination(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);

        $client->request('GET', '/api/activity', ['limit' => 101]);
        $this->assertResponseStatusCodeSame(400);

        $client->request('GET', '/api/activity', ['offset' => -1]);
        $this->assertResponseStatusCodeSame(400);
    }

    public function testActivityValueIsSignedPerExpenseSide(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $payee = UserFactory::createUser();
        $debtor = UserFactory::createUser();
        $entityManager->persist($payee);
        $entityManager->persist($debtor);

        $expense = new Expense($payee, 'Groceries', null, '100.00', new \DateTimeImmutable('2026-05-01'));
        $entityManager->persist($expense);
        $this->addDebt($expense, $debtor, '60.00');
        $this->addDebt($expense, $payee, '40.00');

        $entityManager->flush();

        $client->loginUser($payee);
        $client->request('GET', '/api/activity');
        $this->assertJsonResponseIsSuccessful();

        $payeeResponse = $this->getJsonResponse();
        $this->assertCount(1, $payeeResponse);
        $this->assertSame('60.00', $payeeResponse[0]['value']);
        $this->assertSame('100.00', $payeeResponse[0]['amount']);

        $client->loginUser($debtor);
        $client->request('GET', '/api/activity');
        $this->assertJsonResponseIsSuccessful();

        $debtorResponse = $this->getJsonResponse();
        $this->assertCount(1, $debtorResponse);
        $this->assertSame('-60.00', $debtorResponse[0]['value']);
    }

    public function testActivityValueIsSignedPerTransferSide(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $payer = UserFactory::createUser();
        $payee = UserFactory::createUser();
        $entityManager->persist($payer);
        $entityManager->persist($payee);

        $this->createTransfer($payer, $payee, '25.00', '2026-06-01', 'Settle up');

        $entityManager->flush();

        $client->loginUser($payer);
        $client->request('GET', '/api/activity');
        $this->assertJsonResponseIsSuccessful();

        $payerResponse = $this->getJsonResponse();
        $this->assertCount(1, $payerResponse);
        $this->assertSame('25.00', $payerResponse[0]['value']);

        $client->loginUser($payee);
        $client->request('GET', '/api/activity');
        $this->assertJsonResponseIsSuccessful();

        $payeeResponse = $this->getJsonResponse();
        $this->assertCount(1, $payeeResponse);
        $this->assertSame('-25.00', $payeeResponse[0]['value']);
    }

    public function testActivityExcludesItemsTheUserIsNotPartOf(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $user = UserFactory::createUser();
        $strangerOne = UserFactory::createUser();
        $strangerTwo = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->persist($strangerOne);
        $entityManager->persist($strangerTwo);

        $this->createExpense($strangerOne, $strangerTwo, '10.00', '2026-07-01', 'Not mine');
        $this->createTransfer($strangerOne, $strangerTwo, '10.00', '2026-07-02', 'Not mine either');
        $this->createExpense($user, $strangerOne, '10.00', '2026-07-03', 'Mine');

        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/activity');

        $this->assertJsonResponseIsSuccessful();

        $response = $this->getJsonResponse();
        $this->assertCount(1, $response);
        $this->assertSame('Mine', $response[0]['title']);
    }

    public function testActivityFiltersByContact(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $user = UserFactory::createUser();
        $contact = UserFactory::createUser();
        $otherContact = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->persist($contact);
        $entityManager->persist($otherContact);

        $this->createExpense($user, $contact, '10.00', '2026-08-01', 'Shared expense');
        $this->createTransfer($contact, $user, '20.00', '2026-08-02', 'Shared transfer');
        $this->createExpense($user, $otherContact, '30.00', '2026-08-03', 'Other expense');
        $this->createTransfer($user, $otherContact, '40.00', '2026-08-04', 'Other transfer');

        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/activity', ['contactId' => $contact->getId()]);

        $this->assertJsonResponseIsSuccessful();

        $response = $this->getJsonResponse();
        $this->assertSame(
            ['Shared transfer', 'Shared expense'],
            array_map(static fn (array $item): string => $item['title'], $response)
        );
    }

    public function testActivityContactFilterExcludesCoDebtorOnlyExpense(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $user = UserFactory::createUser();
        $contact = UserFactory::createUser();
        $thirdParty = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->persist($contact);
        $entityManager->persist($thirdParty);

        $expense = new Expense($thirdParty, 'Third party dinner', null, '100.00', new \DateTimeImmutable('2026-09-01'));
        $entityManager->persist($expense);
        $this->addDebt($expense, $user, '50.00');
        $this->addDebt($expense, $contact, '50.00');

        $entityManager->flush();

        $client->loginUser($user);

        $client->request('GET', '/api/activity');
        $this->assertJsonResponseIsSuccessful();
        $this->assertCount(1, $this->getJsonResponse());

        $client->request('GET', '/api/activity', ['contactId' => $contact->getId()]);
        $this->assertJsonResponseIsSuccessful();
        $this->assertSame([], $this->getJsonResponse());
    }

    public function testActivityWithUnknownContactReturnsEmptyList(): void
    {
        $client = static::createClient();
        $entityManager = $this->getEntityManager();

        $user = UserFactory::createUser();
        $contact = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->persist($contact);

        $this->createExpense($user, $contact, '10.00', '2026-10-01', 'Shared expense');

        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/activity', ['contactId' => 99999999]);

        $this->assertJsonResponseIsSuccessful();
        $this->assertSame([], $this->getJsonResponse());
    }

    private function getEntityManager(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function createExpense(User $payee, User $debtor, string $amount, string $occurredOn, string $title, ?string $description = null): Expense
    {
        $entityManager = $this->getEntityManager();

        $expense = new Expense($payee, $title, $description, $amount, new \DateTimeImmutable($occurredOn));
        $entityManager->persist($expense);
        $this->addDebt($expense, $debtor, $amount);

        return $expense;
    }

    private function addDebt(Expense $expense, User $payer, string $amount): void
    {
        $debt = new Debt($payer, $expense, $amount);
        $expense->addDebt($debt);
        $this->getEntityManager()->persist($debt);
    }

    private function createTransfer(User $payer, User $payee, string $amount, string $occurredOn, ?string $description = null): Transfer
    {
        $entityManager = $this->getEntityManager();

        $transfer = new Transfer($payer, $payee, $amount, new \DateTimeImmutable($occurredOn), $description);
        $entityManager->persist($transfer);

        return $transfer;
    }
}
