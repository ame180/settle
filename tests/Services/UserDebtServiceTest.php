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
        $user = UserFactory::createUser();
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
