<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Dto\ExpenseDebtRequest;
use App\Enum\SplitType;
use App\Services\SplitCalculator;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class SplitCalculatorTest extends TestCase
{
    private SplitCalculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new SplitCalculator();
        parent::setUp();
    }

    public function testExactPassesThroughAndStoresNoSplitValue(): void
    {
        $result = $this->calculator->calculate(SplitType::Exact, '100.00', [
            new ExpenseDebtRequest(1, '70.00'),
            new ExpenseDebtRequest(2, '30.00'),
        ]);

        $this->assertSame([
            ['payerId' => 1, 'amount' => '70.00', 'splitValue' => null],
            ['payerId' => 2, 'amount' => '30.00', 'splitValue' => null],
        ], $result);
    }

    public function testExactFailsWhenSumDoesNotMatch(): void
    {
        $this->expectException(BadRequestHttpException::class);
        $this->calculator->calculate(SplitType::Exact, '100.00', [
            new ExpenseDebtRequest(1, '70.00'),
            new ExpenseDebtRequest(2, '20.00'),
        ]);
    }

    public function testPercentageComputesAmountsAndStoresPercent(): void
    {
        $result = $this->calculator->calculate(SplitType::Percentage, '100.00', [
            new ExpenseDebtRequest(1, '30.00'),
            new ExpenseDebtRequest(2, '70.00'),
        ]);

        $this->assertSame([
            ['payerId' => 1, 'amount' => '30.00', 'splitValue' => '30.00'],
            ['payerId' => 2, 'amount' => '70.00', 'splitValue' => '70.00'],
        ], $result);
    }

    public function testPercentageFailsWhenNotHundred(): void
    {
        $this->expectException(BadRequestHttpException::class);
        $this->calculator->calculate(SplitType::Percentage, '100.00', [
            new ExpenseDebtRequest(1, '30.00'),
            new ExpenseDebtRequest(2, '60.00'),
        ]);
    }

    public function testSharesDistributesRemainderByLargestFraction(): void
    {
        $result = $this->calculator->calculate(SplitType::Shares, '10.00', [
            new ExpenseDebtRequest(1, '1'),
            new ExpenseDebtRequest(2, '1'),
            new ExpenseDebtRequest(3, '1'),
        ]);

        // 10.00 / 3 = 3.3333; leftover cent goes to the first by stable tie-break.
        $this->assertSame([
            ['payerId' => 1, 'amount' => '3.34', 'splitValue' => '1.00'],
            ['payerId' => 2, 'amount' => '3.33', 'splitValue' => '1.00'],
            ['payerId' => 3, 'amount' => '3.33', 'splitValue' => '1.00'],
        ], $result);

        $this->assertSame('10.00', $this->sum($result));
    }

    public function testSharesProportional(): void
    {
        $result = $this->calculator->calculate(SplitType::Shares, '90.00', [
            new ExpenseDebtRequest(1, '1'),
            new ExpenseDebtRequest(2, '2'),
        ]);

        $this->assertSame([
            ['payerId' => 1, 'amount' => '30.00', 'splitValue' => '1.00'],
            ['payerId' => 2, 'amount' => '60.00', 'splitValue' => '2.00'],
        ], $result);
    }

    public function testEqualSplitsEvenlyWithoutSplitValue(): void
    {
        $result = $this->calculator->calculate(SplitType::Equal, '10.00', [
            new ExpenseDebtRequest(1),
            new ExpenseDebtRequest(2),
            new ExpenseDebtRequest(3),
        ]);

        $this->assertSame([
            ['payerId' => 1, 'amount' => '3.34', 'splitValue' => null],
            ['payerId' => 2, 'amount' => '3.33', 'splitValue' => null],
            ['payerId' => 3, 'amount' => '3.33', 'splitValue' => null],
        ], $result);

        $this->assertSame('10.00', $this->sum($result));
    }

    public function testPercentageWithRoundingStillSumsToTotal(): void
    {
        $result = $this->calculator->calculate(SplitType::Percentage, '100.00', [
            new ExpenseDebtRequest(1, '33.33'),
            new ExpenseDebtRequest(2, '33.33'),
            new ExpenseDebtRequest(3, '33.34'),
        ]);

        $this->assertSame('100.00', $this->sum($result));
    }

    /**
     * @dataProvider nonEqualTypeProvider
     */
    public function testValueIsRequiredForNonEqualTypes(SplitType $splitType): void
    {
        $this->expectException(BadRequestHttpException::class);
        $this->calculator->calculate($splitType, '100.00', [
            new ExpenseDebtRequest(1),
        ]);
    }

    /**
     * @return array<string, array{SplitType}>
     */
    public static function nonEqualTypeProvider(): array
    {
        return [
            'exact' => [SplitType::Exact],
            'percentage' => [SplitType::Percentage],
            'shares' => [SplitType::Shares],
        ];
    }

    /**
     * @param list<array{payerId: int, amount: string, splitValue: ?string}> $result
     */
    private function sum(array $result): string
    {
        return array_reduce($result, fn (string $carry, array $debt) => bcadd($carry, $debt['amount'], 2), '0.00');
    }
}
