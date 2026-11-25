<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Comment;
use App\Entity\Contact;
use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\User;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;

class CommentApiControllerTest extends ApiTestCase
{
    public function testListNotLoggedIn(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/expenses/1/comments');

        $this->assertResponseStatusCodeSame(401);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
    }

    public function testListReturnsCommentsOldestFirstWithViewerDisplayNames(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [$payee, $debtor, $expense] = $this->createSharedExpense($entityManager);
        $debtor->setName('Daniel');
        $entityManager->persist(new Contact($payee, $debtor, 'Danny'));

        $first = new Comment($expense, $debtor, 'Paid by card?');
        $entityManager->persist($first);
        $entityManager->flush();
        $second = new Comment($expense, $payee, 'Yes');
        $entityManager->persist($second);
        $entityManager->flush();

        $client->loginUser($payee);
        $client->request('GET', sprintf('/api/expenses/%d/comments', $expense->getId()));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertJsonStructure([0 => ['id', 'author' => ['id', 'displayName', 'email'], 'body', 'createdAt']]);

        $response = $this->getJsonResponse();
        $this->assertCount(2, $response);
        $this->assertSame($first->getId(), $response[0]['id']);
        $this->assertSame('Paid by card?', $response[0]['body']);
        $this->assertSame('Danny', $response[0]['author']['displayName']);
        $this->assertSame($second->getId(), $response[1]['id']);
    }

    public function testListOnlyIncludesThisExpensesComments(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [$payee, , $expense] = $this->createSharedExpense($entityManager);
        $entityManager->persist(new Comment($expense, $payee, 'On this one'));
        [$otherPayee, , $otherExpense] = $this->createSharedExpense($entityManager);
        $entityManager->persist(new Comment($otherExpense, $otherPayee, 'On another one'));
        $entityManager->flush();

        $client->loginUser($payee);
        $client->request('GET', sprintf('/api/expenses/%d/comments', $expense->getId()));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame(['On this one'], array_column($this->getJsonResponse(), 'body'));
    }

    public function testListIsEmptyWithoutComments(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [$payee, , $expense] = $this->createSharedExpense($entityManager);
        $entityManager->flush();

        $client->loginUser($payee);
        $client->request('GET', sprintf('/api/expenses/%d/comments', $expense->getId()));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame([], $this->getJsonResponse());
    }

    public function testListFailsWhenExpenseDoesNotExist(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);
        $client->request('GET', '/api/expenses/999999/comments');

        $this->assertResponseStatusCodeSame(404);
    }

    public function testListFailsWhenUserIsNotInvolved(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [, , $expense] = $this->createSharedExpense($entityManager);
        $outsider = UserFactory::createUser();
        $entityManager->persist($outsider);
        $entityManager->flush();

        $client->loginUser($outsider);
        $client->request('GET', sprintf('/api/expenses/%d/comments', $expense->getId()));

        $this->assertResponseStatusCodeSame(403);
    }

    public function testCreateNotLoggedIn(): void
    {
        $client = static::createClient();
        $this->requestJson($client, 'POST', '/api/expenses/1/comments', ['body' => 'Hi']);

        $this->assertResponseStatusCodeSame(401);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
    }

    public function testCreateAsDebtor(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [, $debtor, $expense] = $this->createSharedExpense($entityManager);
        $entityManager->flush();

        $client->loginUser($debtor);
        $this->requestJson($client, 'POST', sprintf('/api/expenses/%d/comments', $expense->getId()), ['body' => "  Thanks!\nSee you  "]);

        $this->assertJsonResponseIsSuccessful(201);
        $this->assertJsonStructure(['id', 'author' => ['id', 'displayName', 'email'], 'body', 'createdAt']);

        $response = $this->getJsonResponse();
        $this->assertSame("Thanks!\nSee you", $response['body']);
        $this->assertSame($debtor->getId(), $response['author']['id']);

        $entityManager->clear();
        $comment = $entityManager->getRepository(Comment::class)->find($response['id']);
        $this->assertInstanceOf(Comment::class, $comment);
        $this->assertSame($expense->getId(), $comment->getExpense()->getId());
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function invalidBodies(): iterable
    {
        yield 'blank' => [['body' => '   ']];
        yield 'too long' => [['body' => str_repeat('a', 1001)]];
        yield 'missing' => [['text' => 'Hi']];
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @dataProvider invalidBodies
     */
    public function testCreateRejectsInvalidBody(array $payload): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [$payee, , $expense] = $this->createSharedExpense($entityManager);
        $entityManager->flush();

        $client->loginUser($payee);
        $this->requestJson($client, 'POST', sprintf('/api/expenses/%d/comments', $expense->getId()), $payload);

        $this->assertResponseStatusCodeSame(400);
        $this->assertSame(0, $entityManager->getRepository(Comment::class)->count([]));
    }

    public function testCreateAcceptsMaxLengthBodyWithSurroundingWhitespace(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [$payee, , $expense] = $this->createSharedExpense($entityManager);
        $entityManager->flush();

        $client->loginUser($payee);
        $this->requestJson($client, 'POST', sprintf('/api/expenses/%d/comments', $expense->getId()), ['body' => ' '.str_repeat('a', 1000).' ']);

        $this->assertJsonResponseIsSuccessful(201);
        $this->assertSame(str_repeat('a', 1000), $this->getJsonResponse()['body']);
    }

    public function testCreateFailsWhenExpenseDoesNotExist(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        $client->loginUser($user);
        $this->requestJson($client, 'POST', '/api/expenses/999999/comments', ['body' => 'Hi']);

        $this->assertResponseStatusCodeSame(404);
    }

    public function testCreateFailsWhenUserIsNotInvolved(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [, , $expense] = $this->createSharedExpense($entityManager);
        $outsider = UserFactory::createUser();
        $entityManager->persist($outsider);
        $entityManager->flush();

        $client->loginUser($outsider);
        $this->requestJson($client, 'POST', sprintf('/api/expenses/%d/comments', $expense->getId()), ['body' => 'Hi']);

        $this->assertResponseStatusCodeSame(403);
    }

    public function testDeletingExpenseDeletesItsComments(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        [$payee, , $expense] = $this->createSharedExpense($entityManager);
        $entityManager->persist(new Comment($expense, $payee, 'Bye'));
        $entityManager->flush();

        $client->loginUser($payee);
        $client->request('DELETE', sprintf('/api/expenses/%d', $expense->getId()));

        $this->assertResponseStatusCodeSame(204);
        $this->assertSame(0, $entityManager->getRepository(Comment::class)->count([]));
    }

    /**
     * @return array{User, User, Expense}
     */
    private function createSharedExpense(EntityManagerInterface $entityManager): array
    {
        $payee = UserFactory::createUser();
        $debtor = UserFactory::createUser();
        $entityManager->persist($payee);
        $entityManager->persist($debtor);

        $expense = new Expense($payee, 'Dinner', null, '20.00', new \DateTimeImmutable('2026-01-01'));
        $entityManager->persist($expense);
        $debt = new Debt($debtor, $expense, '10.00');
        $expense->addDebt($debt);
        $entityManager->persist($debt);

        return [$payee, $debtor, $expense];
    }
}
