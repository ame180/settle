<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Enum\SplitType;
use App\Tests\Support\Factory\UserFactory;
use PHPUnit\Framework\TestCase;

class ExpenseTest extends TestCase
{
    private function makeExpense(string $currency = 'PLN'): Expense
    {
        return new Expense(
            UserFactory::createUser(),
            'Test',
            null,
            '10.00',
            new \DateTimeImmutable(),
            $currency,
        );
    }

    public function testSetCurrencyAcceptsValidIsoCodes(): void
    {
        $expense = $this->makeExpense();

        foreach (['PLN', 'USD', 'EUR', 'GBP'] as $code) {
            $expense->setCurrency($code);
            $this->assertSame($code, $expense->getCurrency());
        }
    }

    public function testConstructorDefaultsToPlnCurrency(): void
    {
        $expense = new Expense(
            UserFactory::createUser(),
            'Test',
            null,
            '10.00',
            new \DateTimeImmutable(),
        );

        $this->assertSame('PLN', $expense->getCurrency());
    }

    /**
     * @dataProvider invalidCurrencyProvider
     */
    public function testSetCurrencyRejectsInvalidCodes(string $invalid): void
    {
        $expense = $this->makeExpense();

        $this->expectException(\InvalidArgumentException::class);
        $expense->setCurrency($invalid);
    }

    /**
     * @dataProvider invalidCurrencyProvider
     */
    public function testConstructorRejectsInvalidCurrencyCodes(string $invalid): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->makeExpense($invalid);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function invalidCurrencyProvider(): array
    {
        return [
            'lowercase' => ['pln'],
            'mixed case' => ['Pln'],
            'too short' => ['PL'],
            'too long' => ['PLNN'],
            'numeric' => ['123'],
            'empty string' => [''],
        ];
    }

    public function testConstructorDefaultsToExactSplitType(): void
    {
        $this->assertSame(SplitType::Exact, $this->makeExpense()->getSplitType());
    }

    public function testSetSplitType(): void
    {
        $expense = $this->makeExpense();
        $expense->setSplitType(SplitType::Shares);

        $this->assertSame(SplitType::Shares, $expense->getSplitType());
    }

    public function testAddDebtAcceptsMatchingCurrency(): void
    {
        $expense = $this->makeExpense('EUR');
        $debt = new Debt(UserFactory::createUser(), $expense, '10.00', 'EUR');

        $expense->addDebt($debt);

        $this->assertTrue($expense->getDebts()->contains($debt));
    }

    public function testAddDebtRejectsMismatchedCurrency(): void
    {
        $expense = $this->makeExpense('PLN');
        $debt = new Debt(UserFactory::createUser(), $expense, '10.00', 'EUR');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('currency');
        $expense->addDebt($debt);
    }
}
