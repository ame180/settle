<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\Transfer;
use App\Entity\User;
use App\Services\UserDebtService;
use App\Tests\Support\Factory\UserFactory;
use PHPUnit\Framework\TestCase;

class UserDebtServiceTest extends TestCase
{
    private UserDebtService $service;

    /**
     * @return array<int, array{User, list<string>, list<string>, string}>
     */
    public function expenseAndDebtsProvider(): array
    {
        return [
            // Debt calculation
            [UserFactory::createUser(), [], [], '0.00'],
            [UserFactory::createUser(), [], ['10', '20', '30'], '60.00'],
            [UserFactory::createUser(), [], ['10.001', '20.01', '30.1'], '60.11'],
            // Expense calculation
            [UserFactory::createUser(), [], [], '0.00'],
            [UserFactory::createUser(), ['10', '20', '30'], [], '-60.00'],
            [UserFactory::createUser(), ['10.001', '20.01', '30.1'], [], '-60.11'],
            // Debt and expense calculation
            [UserFactory::createUser(), ['10', '20', '30'], ['10', '20', '30'], '0.00'],
            [UserFactory::createUser(), ['10.001', '20.01', '30.1'], ['10.001', '20.01', '30.1'], '0.00'],
            [UserFactory::createUser(), ['10', '20', '30'], ['10.001', '20.01', '30.1'], '0.11'],
            [UserFactory::createUser(), ['10.001', '20.01', '30.1'], ['10', '20', '30'], '-0.11'],
        ];
    }

    protected function setUp(): void
    {
        $this->service = new UserDebtService();
        parent::setUp();
    }

    /**
     * @param string[] $expenses
     * @param string[] $debts
     *
     * @dataProvider expenseAndDebtsProvider
     */
    public function testFewDebtsAmount(User $user, array $expenses, array $debts, string $resultAmount): void
    {
        foreach ($debts as $amount) {
            $this->addDebtToUser($user, $amount);
        }
        foreach ($expenses as $amount) {
            $this->addExpenseToUser($user, $amount);
        }
        $this->assertEquals($resultAmount, $this->service->getUserDebtAmount($user));
    }

    public function testNumberPrecision(): void
    {
        $user = UserFactory::createUser();
        $float = 0.1;
        $floatResult = 0;
        for ($i = 0; $i < 1000; ++$i) {
            $this->addDebtToUser($user, (string) $float);
            $floatResult += $float;
        }
        $userDebtAmount = $this->service->getUserDebtAmount($user);
        $this->assertEquals(100, $userDebtAmount);
        $this->assertNotEquals($floatResult, $userDebtAmount);
    }

    public function testMultiUserDebtAmounts(): void
    {
        $user1 = UserFactory::createUser();
        $user2 = UserFactory::createUser();

        $expense1 = new Expense($user1, '50/50 Expense', '', '10', new \DateTimeImmutable('2026-01-01'));
        $user1->addExpense($expense1);
        $user1->addDebt(new Debt($user1, $expense1, '5'));
        $user2->addDebt(new Debt($user2, $expense1, '5'));

        $expense2 = new Expense($user2, 'Fully owed expense', '', '10', new \DateTimeImmutable('2026-01-01'));
        $user2->addExpense($expense2);
        $user1->addDebt(new Debt($user1, $expense2, '10'));

        $expense3 = new Expense($user1, 'Expense owed to self', '', '10', new \DateTimeImmutable('2026-01-01'));
        $user1->addExpense($expense3);
        $user1->addDebt(new Debt($user1, $expense3, '10'));

        $this->assertEquals('5.00', $this->service->getUserDebtAmount($user1));
        $this->assertEquals('-5.00', $this->service->getUserDebtAmount($user2));
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
        $users = [
            'payee' => UserFactory::createUser(),
        ];

        $expense = new Expense($users['payee'], 'Title', 'Description', $totalAmount, new \DateTimeImmutable('2026-01-01'));

        foreach ($debts as $userKey => $amount) {
            if (!isset($users[$userKey])) {
                $users[$userKey] = UserFactory::createUser();
            }
            $debt = new Debt($users[$userKey], $expense, $amount);
            $expense->addDebt($debt);
        }

        if (!isset($users[$targetUserKey])) {
            $users[$targetUserKey] = UserFactory::createUser();
        }

        $balance = $this->service->calculateExpenseBalanceForUser($expense, $users[$targetUserKey]);
        $this->assertEquals($expectedBalance, $balance);
    }

    public function testTransfersAdjustUserDebtAmount(): void
    {
        $payer = UserFactory::createUser();
        $payee = UserFactory::createUser();

        $transfer = new Transfer($payer, $payee, '10.00', new \DateTimeImmutable('2026-01-01'));
        $payer->addTransferSent($transfer);
        $payee->addTransferReceived($transfer);

        // Paying reduces what the payer owes; being paid reduces what the payee is owed.
        $this->assertEquals('-10.00', $this->service->getUserDebtAmount($payer));
        $this->assertEquals('10.00', $this->service->getUserDebtAmount($payee));
    }

    public function testTransferSettlesDebtToZero(): void
    {
        $debtor = UserFactory::createUser();
        $creditor = UserFactory::createUser();

        $expense = new Expense($creditor, 'Dinner', '', '10.00', new \DateTimeImmutable('2026-01-01'));
        $creditor->addExpense($expense);
        $debtor->addDebt(new Debt($debtor, $expense, '10.00'));

        $this->assertEquals('10.00', $this->service->getUserDebtAmount($debtor));
        $this->assertEquals('-10.00', $this->service->getUserDebtAmount($creditor));

        $transfer = new Transfer($debtor, $creditor, '10.00', new \DateTimeImmutable('2026-01-02'));
        $debtor->addTransferSent($transfer);
        $creditor->addTransferReceived($transfer);

        $this->assertEquals('0.00', $this->service->getUserDebtAmount($debtor));
        $this->assertEquals('0.00', $this->service->getUserDebtAmount($creditor));
    }

    private function addDebtToUser(User $user, string $amount): void
    {
        $otherUser = UserFactory::createUser();
        $expense = new Expense($otherUser, 'title', 'description', $amount, new \DateTimeImmutable('2026-01-01'));

        $user->addDebt(new Debt($user, $expense, $amount));
    }

    private function addExpenseToUser(User $user, string $amount): void
    {
        $expense = new Expense($user, 'title', 'description', $amount, new \DateTimeImmutable('2026-01-01'));

        $user->addExpense($expense);
    }
}
