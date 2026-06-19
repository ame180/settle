<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\Transfer;
use App\Tests\Support\Factory\UserFactory;
use PHPUnit\Framework\TestCase;

class TransferTest extends TestCase
{
    private function makeTransfer(string $currency = 'PLN'): Transfer
    {
        return new Transfer(
            UserFactory::createUser(),
            UserFactory::createUser(),
            '10.00',
            new \DateTimeImmutable(),
            null,
            $currency,
        );
    }

    public function testConstructorNormalizesAmountToTwoDecimals(): void
    {
        $transfer = new Transfer(
            UserFactory::createUser(),
            UserFactory::createUser(),
            '10',
            new \DateTimeImmutable(),
        );

        $this->assertSame('10.00', $transfer->getAmount());

        $transfer->setAmount('5.1');
        $this->assertSame('5.10', $transfer->getAmount());
    }

    public function testConstructorRejectsSamePayerAndPayee(): void
    {
        $user = UserFactory::createUser();

        $this->expectException(\InvalidArgumentException::class);
        new Transfer($user, $user, '10.00', new \DateTimeImmutable());
    }

    public function testConstructorDefaultsToPlnCurrency(): void
    {
        $transfer = new Transfer(
            UserFactory::createUser(),
            UserFactory::createUser(),
            '10.00',
            new \DateTimeImmutable(),
        );

        $this->assertSame('PLN', $transfer->getCurrency());
    }

    public function testSetCurrencyAcceptsValidIsoCodes(): void
    {
        $transfer = $this->makeTransfer();

        foreach (['PLN', 'USD', 'EUR', 'GBP'] as $code) {
            $transfer->setCurrency($code);
            $this->assertSame($code, $transfer->getCurrency());
        }
    }

    /**
     * @dataProvider invalidCurrencyProvider
     */
    public function testSetCurrencyRejectsInvalidCodes(string $invalid): void
    {
        $transfer = $this->makeTransfer();

        $this->expectException(\InvalidArgumentException::class);
        $transfer->setCurrency($invalid);
    }

    /**
     * @dataProvider invalidCurrencyProvider
     */
    public function testConstructorRejectsInvalidCurrencyCodes(string $invalid): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->makeTransfer($invalid);
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
