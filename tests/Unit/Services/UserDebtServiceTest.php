<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\User;
use App\Services\UserDebtService;
use App\Tests\Support\Factory\UserFactory;
use PHPUnit\Framework\TestCase;

class UserDebtServiceTest extends TestCase
{
    private UserDebtService $service;

    protected function setUp(): void
    {
        $this->service = new UserDebtService();
        parent::setUp();
    }

    /**
     * @return array<string, array{numeric-string, array<string, numeric-string>, string, numeric-string}>
     */
    public function calculateExpenseBalanceProvider(): array
    {
        return [
            'Payee is owed balance' => [
                '100.00',
                ['payee' => '20.00', 'payer1' => '40.00', 'payer2' => '40.00'],
                'payee',
                '80.00',
            ],
            'Payer owes balance' => [
                '50.00',
                ['payee' => '25.00', 'payer' => '25.00'],
                'payer',
                '-25.00',
            ],
            'Uninvolved user has no balance' => [
                '10.00',
                ['payer' => '10.00'],
                'uninvolved',
                '0.00',
            ],
            'Payee owes full amount to self' => [
                '100.00',
                ['payee' => '100.00'],
                'payee',
                '0.00',
            ],
        ];
    }

    /**
     * @dataProvider calculateExpenseBalanceProvider
     *
     * @param array<string, numeric-string> $debts
     */
    public function testCalculateExpenseBalanceForUser(string $totalAmount, array $debts, string $targetUserKey, string $expectedBalance): void
    {
        $users = ['payee' => UserFactory::createUser()];
        $expense = $this->createExpense($users, $totalAmount, $debts);

        if (!isset($users[$targetUserKey])) {
            $users[$targetUserKey] = UserFactory::createUser();
        }

        $balance = $this->service->calculateExpenseBalanceForUser($expense, $users[$targetUserKey]);
        $this->assertEquals($expectedBalance, $balance);
    }

    /**
     * @return array<string, array{numeric-string, array<string, numeric-string>, string, string, numeric-string}>
     */
    public function calculateExpenseBalanceBetweenProvider(): array
    {
        return [
            'User is payee, counterpart owes their share only' => [
                '90.00',
                ['payee' => '30.00', 'a' => '30.00', 'b' => '30.00'],
                'payee',
                'a',
                '30.00',
            ],
            'Counterpart is payee, user owes their share' => [
                '90.00',
                ['payee' => '30.00', 'a' => '30.00', 'b' => '30.00'],
                'a',
                'payee',
                '-30.00',
            ],
            'Co-debtors owe each other nothing' => [
                '90.00',
                ['payee' => '30.00', 'a' => '30.00', 'b' => '30.00'],
                'a',
                'b',
                '0.00',
            ],
            'Counterpart without a share owes nothing' => [
                '50.00',
                ['payee' => '50.00'],
                'payee',
                'a',
                '0.00',
            ],
        ];
    }

    /**
     * @dataProvider calculateExpenseBalanceBetweenProvider
     *
     * @param array<string, numeric-string> $debts
     */
    public function testCalculateExpenseBalanceBetween(string $totalAmount, array $debts, string $userKey, string $counterpartKey, string $expectedBalance): void
    {
        $users = ['payee' => UserFactory::createUser()];
        $expense = $this->createExpense($users, $totalAmount, $debts);

        foreach ([$userKey, $counterpartKey] as $key) {
            if (!isset($users[$key])) {
                $users[$key] = UserFactory::createUser();
            }
        }

        $balance = $this->service->calculateExpenseBalanceBetween($expense, $users[$userKey], $users[$counterpartKey]);
        $this->assertSame($expectedBalance, $balance);
    }

    /**
     * @param array<string, User>           $users must contain 'payee'; missing debtors are added
     * @param array<string, numeric-string> $debts
     */
    private function createExpense(array &$users, string $totalAmount, array $debts): Expense
    {
        $expense = new Expense($users['payee'], 'Title', 'Description', $totalAmount, new \DateTimeImmutable('2026-01-01'));

        foreach ($debts as $userKey => $amount) {
            if (!isset($users[$userKey])) {
                $users[$userKey] = UserFactory::createUser();
            }
            $expense->addDebt(new Debt($users[$userKey], $expense, $amount));
        }

        return $expense;
    }
}
