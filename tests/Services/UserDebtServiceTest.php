<?php

declare(strict_types=1);

namespace App\Tests\Services;

use App\Entity\Debt;
use App\Entity\User;
use App\Services\UserDebtService;
use App\Tests\Services\Utils\UserFactory;
use PHPUnit\Framework\TestCase;


class UserDebtServiceTest extends TestCase
{
    private UserDebtService $service;

    public function debtsAmountProvider(): array
    {
        return [
            [UserFactory::createUser(), [], "0.00"],
            [UserFactory::createUser(), ['10', '20', '30'], '60.00'],
            [UserFactory::createUser(), ["10.001", "20.01", "30.1"], '60.11'],
        ];
    }

    protected function setUp(): void
    {
        $this->service = new UserDebtService();
        parent::setUp();
    }

    /**
     * @param User   $user
     * @param string[] $amounts
     * @param string $resultAmount
     *
     * @dataProvider debtsAmountProvider
     */
    public function testFewDebtsAmount(User $user, array $amounts, string $resultAmount): void
    {
        $user = UserFactory::createUser();
        foreach ($amounts as $amount) {
            $this->addDebtToUser($user, $amount);
        }
        $this->assertEquals($resultAmount, $this->service->getUserDebtAmount($user));
    }

    public function testNumberPrecision(): void
    {
        $user = UserFactory::createUser();
        $float = 0.1;
        $floatResult = 0;
        for ($i = 0; $i < 1000; $i++) {
            $this->addDebtToUser($user, (string)$float);
            $floatResult += $float;
        }
        $userDebtAmount = $this->service->getUserDebtAmount($user);
        $this->assertEquals(100, $userDebtAmount);
        $this->assertNotEquals($floatResult, $userDebtAmount);
    }

    private function addDebtToUser(User $user, string $amount): void
    {
        $user->addDebt(new Debt($user, $amount));
    }
}
