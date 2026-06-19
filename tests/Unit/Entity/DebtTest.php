<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Tests\Support\Factory\UserFactory;
use PHPUnit\Framework\TestCase;

class DebtTest extends TestCase
{
    private function makeDebt(string $currency = 'PLN'): Debt
    {
        $expense = new Expense(
            UserFactory::createUser(),
            'Test',
            null,
            '10.00',
            new \DateTimeImmutable(),
            $currency,
        );

        return new Debt(UserFactory::createUser(), $expense, '10.00', $currency);
    }

    public function testSplitValueDefaultsToNull(): void
    {
        $this->assertNull($this->makeDebt()->getSplitValue());
    }

    public function testSetSplitValueNormalisesToTwoDecimals(): void
    {
        $debt = $this->makeDebt();
        $debt->setSplitValue('2');

        $this->assertSame('2.00', $debt->getSplitValue());

        $debt->setSplitValue(null);
        $this->assertNull($debt->getSplitValue());
    }

    public function testSetCurrencyAcceptsValidIsoCodes(): void
    {
        $debt = $this->makeDebt();

        foreach (['PLN', 'USD', 'EUR', 'GBP'] as $code) {
            $debt->setCurrency($code);
            $this->assertSame($code, $debt->getCurrency());
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
        $debt = new Debt(UserFactory::createUser(), $expense, '10.00');

        $this->assertSame('PLN', $debt->getCurrency());
    }

    /**
     * @dataProvider invalidCurrencyProvider
     */
    public function testSetCurrencyRejectsInvalidCodes(string $invalid): void
    {
        $debt = $this->makeDebt();

        $this->expectException(\InvalidArgumentException::class);
        $debt->setCurrency($invalid);
    }

    /**
     * @dataProvider invalidCurrencyProvider
     */
    public function testConstructorRejectsInvalidCurrencyCodes(string $invalid): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->makeDebt($invalid);
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
}
