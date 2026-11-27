<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Contact;
use App\Entity\Expense;
use App\Entity\Transfer;
use App\Entity\User;
use App\Enum\ExpenseCategory;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;

class SplitwiseImportApiControllerTest extends ApiTestCase
{
    private KernelBrowser $client;
    private User $anna;
    private User $ben;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $entityManager = $this->getEntityManager();

        $this->anna = UserFactory::createUser('anna@example.com');
        $this->ben = UserFactory::createUser('ben@example.com');
        $entityManager->persist($this->anna);
        $entityManager->persist($this->ben);
        $entityManager->persist(new Contact($this->anna, $this->ben));
        $entityManager->flush();

        $this->client->loginUser($this->anna);
    }

    public function testNotLoggedIn(): void
    {
        $client = $this->client;
        $client->restart();
        $this->requestJson($client, 'POST', $this->url(dryRun: true), ['csv' => self::fixture('en.csv')]);

        $this->assertResponseStatusCodeSame(401);
    }

    public function testDryRunDescribesBothSidesWithoutWriting(): void
    {
        $this->requestJson($this->client, 'POST', $this->url(dryRun: true), ['csv' => self::fixture('en.csv')]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame([
            'names' => ['Anna Kowalska', 'Ben Nowak'],
            'mismatches' => [],
            'options' => [
                ['expenses' => 4, 'transfers' => 1, 'skipped' => 2, 'balance' => '122.20'],
                ['expenses' => 4, 'transfers' => 1, 'skipped' => 2, 'balance' => '-122.20'],
            ],
        ], $this->getJsonResponse());

        $this->assertSame(0, $this->countRows(Expense::class));
        $this->assertSame(0, $this->countRows(Transfer::class));
    }

    public function testDryRunReportsTotalMismatch(): void
    {
        $csv = str_replace('PLN,122.20,-122.20', 'PLN,120.00,-120.00', self::fixture('en.csv'));

        $this->requestJson($this->client, 'POST', $this->url(dryRun: true), ['csv' => $csv]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame([['currency' => 'PLN', 'amount' => '2.20']], $this->getJsonResponse()['mismatches']);
    }

    public function testImportCreatesExpensesAndTransfersForTheChosenSide(): void
    {
        $this->requestJson($this->client, 'POST', $this->url(), ['csv' => self::fixture('en.csv'), 'ownColumn' => 0]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame(['expenses' => 4, 'transfers' => 1, 'skipped' => 2, 'balance' => '122.20'], $this->getJsonResponse());

        $entityManager = $this->getEntityManager();
        $entityManager->clear();

        $groceries = $entityManager->getRepository(Expense::class)->findOneBy(['title' => 'Groceries run']);
        $this->assertNotNull($groceries);
        $this->assertSame('anna@example.com', $groceries->getPayee()->getEmail());
        $this->assertSame('100.00', $groceries->getAmount());
        $this->assertSame(ExpenseCategory::Groceries, $groceries->getCategory());
        $this->assertSame('2025-01-10', $groceries->getOccurredOn()->format('Y-m-d'));
        $this->assertNull($groceries->getDescription());
        $this->assertSame(['anna@example.com' => '50.00', 'ben@example.com' => '50.00'], $this->sharesByEmail($groceries));

        $taxi = $entityManager->getRepository(Expense::class)->findOneBy(['title' => 'Taxi, airport']);
        $this->assertNotNull($taxi);
        $this->assertSame('ben@example.com', $taxi->getPayee()->getEmail());
        $this->assertSame(ExpenseCategory::Transport, $taxi->getCategory());
        $this->assertSame(['anna@example.com' => '80.00'], $this->sharesByEmail($taxi));

        $transfer = $entityManager->getRepository(Transfer::class)->findOneBy([]);
        $this->assertNotNull($transfer);
        $this->assertSame('ben@example.com', $transfer->getPayer()->getEmail());
        $this->assertSame('anna@example.com', $transfer->getPayee()->getEmail());
        $this->assertSame('20.00', $transfer->getAmount());
        $this->assertNull($transfer->getDescription());

        $this->client->request('GET', '/api/contacts');
        $this->assertSame([['currency' => 'PLN', 'amount' => '122.20']], $this->getJsonResponse()['items'][0]['balances']);
    }

    public function testImportAsSecondPersonFlipsDirection(): void
    {
        $this->requestJson($this->client, 'POST', $this->url(), ['csv' => self::fixture('en.csv'), 'ownColumn' => 1]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame('-122.20', $this->getJsonResponse()['balance']);

        $this->getEntityManager()->clear();
        $groceries = $this->getEntityManager()->getRepository(Expense::class)->findOneBy(['title' => 'Groceries run']);
        $this->assertNotNull($groceries);
        $this->assertSame('ben@example.com', $groceries->getPayee()->getEmail());
    }

    public function testReimportSkipsEverythingAlreadyImported(): void
    {
        $this->requestJson($this->client, 'POST', $this->url(), ['csv' => self::fixture('en.csv'), 'ownColumn' => 0]);
        $this->assertJsonResponseIsSuccessful(200);

        $this->requestJson($this->client, 'POST', $this->url(dryRun: true), ['csv' => self::fixture('en.csv')]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame(['expenses' => 0, 'transfers' => 0, 'skipped' => 7, 'balance' => '122.20'], $this->getJsonResponse()['options'][0]);
    }

    public function testPolishExportOfTheSameHistoryAddsNothing(): void
    {
        $this->requestJson($this->client, 'POST', $this->url(), ['csv' => self::fixture('en.csv'), 'ownColumn' => 0]);
        $this->assertJsonResponseIsSuccessful(200);

        $this->requestJson($this->client, 'POST', $this->url(), ['csv' => self::fixture('pl.csv'), 'ownColumn' => 0]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame(['expenses' => 0, 'transfers' => 0, 'skipped' => 7, 'balance' => '122.20'], $this->getJsonResponse());
        $this->assertSame(4, $this->countRows(Expense::class));
        $this->assertSame(1, $this->countRows(Transfer::class));
    }

    public function testPolishExportMapsCategoriesAndPayments(): void
    {
        $this->requestJson($this->client, 'POST', $this->url(), ['csv' => self::fixture('pl.csv'), 'ownColumn' => 0]);

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertSame(['expenses' => 4, 'transfers' => 1, 'skipped' => 2, 'balance' => '122.20'], $this->getJsonResponse());

        $this->getEntityManager()->clear();
        $phone = $this->getEntityManager()->getRepository(Expense::class)->findOneBy(['title' => 'Phone']);
        $this->assertNotNull($phone);
        $this->assertSame(ExpenseCategory::HomeAndBills, $phone->getCategory());
    }

    public function testImportRequiresOwnColumn(): void
    {
        $this->requestJson($this->client, 'POST', $this->url(), ['csv' => self::fixture('en.csv')]);

        $this->assertResponseStatusCodeSame(400);
        $this->assertSame(0, $this->countRows(Expense::class));
    }

    public function testRejectsFileOfAnotherShape(): void
    {
        $this->requestJson($this->client, 'POST', $this->url(dryRun: true), ['csv' => "Date,Amount\n2025-01-10,10.00\n"]);

        $this->assertResponseStatusCodeSame(422);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
    }

    public function testRejectsUnrelatedUser(): void
    {
        $stranger = UserFactory::createUser('stranger@example.com');
        $this->getEntityManager()->persist($stranger);
        $this->getEntityManager()->flush();

        $this->requestJson($this->client, 'POST', '/api/contacts/'.$stranger->getId().'/import/splitwise', ['csv' => self::fixture('en.csv'), 'ownColumn' => 0]);

        $this->assertResponseStatusCodeSame(404);
        $this->assertSame(0, $this->countRows(Expense::class));
    }

    private function url(bool $dryRun = false): string
    {
        return '/api/contacts/'.$this->ben->getId().'/import/splitwise'.($dryRun ? '?dryRun=1' : '');
    }

    /**
     * @return array<string, string>
     */
    private function sharesByEmail(Expense $expense): array
    {
        $shares = [];
        foreach ($expense->getDebts() as $debt) {
            $shares[(string) $debt->getPayer()->getEmail()] = $debt->getAmount();
        }

        ksort($shares);

        return $shares;
    }

    /**
     * @param class-string $entityClass
     */
    private function countRows(string $entityClass): int
    {
        return (int) $this->getEntityManager()->createQueryBuilder()
            ->select('COUNT(entity.id)')
            ->from($entityClass, 'entity')
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function getEntityManager(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private static function fixture(string $file): string
    {
        return (string) file_get_contents(__DIR__.'/../Support/fixtures/splitwise/'.$file);
    }
}
