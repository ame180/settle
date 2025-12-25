<?php

declare(strict_types=1);

namespace App\Tests\Services;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\User;
use App\Services\UserDebtService;
use App\Tests\Services\Utils\UserFactory;
use PHPUnit\Framework\TestCase;

class UserDebtServiceTest extends TestCase
{
    private UserDebtService $service;

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

        $expense1 = new Expense($user1, '50/50 Expense', '', '10');
        $user1->addExpense($expense1);
        $user1->addDebt(new Debt($user1, $expense1, '5'));
        $user2->addDebt(new Debt($user2, $expense1, '5'));

        $expense2 = new Expense($user2, 'Fully owed expense', '', '10');
        $user2->addExpense($expense2);
        $user1->addDebt(new Debt($user1, $expense2, '10'));

        $expense3 = new Expense($user1, 'Expense owed to self', '', '10');
        $user1->addExpense($expense3);
        $user1->addDebt(new Debt($user1, $expense3, '10'));

        $this->assertEquals('5.00', $this->service->getUserDebtAmount($user1));
        $this->assertEquals('-5.00', $this->service->getUserDebtAmount($user2));
    }

    private function addDebtToUser(User $user, string $amount): void
    {
        $otherUser = UserFactory::createUser();
        $expense = new Expense($otherUser, 'title', 'description', $amount);

        $user->addDebt(new Debt($user, $expense, $amount));
    }

    private function addExpenseToUser(User $user, string $amount): void
    {
        $expense = new Expense($user, 'title', 'description', $amount);

        $user->addExpense($expense);
    }
}
