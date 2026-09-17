<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\ExpenseDebtRequest;
use App\Enum\SplitType;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class SplitCalculator
{
    /**
     * Resolves a split request into the final per-debtor amounts and the modifier
     * value to persist for each debtor.
     *
     * @param list<ExpenseDebtRequest> $debts
     *
     * @return list<array{payerId: int, amount: string, splitValue: ?string}>
     */
    public function calculate(SplitType $splitType, string $total, array $debts): array
    {
        return match ($splitType) {
            SplitType::Exact => $this->exact($total, $debts),
            SplitType::Percentage => $this->percentage($total, $debts),
            SplitType::Shares => $this->shares($total, $debts),
            SplitType::Equal => $this->equal($total, $debts),
        };
    }

    /**
     * @param list<ExpenseDebtRequest> $debts
     *
     * @return list<array{payerId: int, amount: string, splitValue: ?string}>
     */
    private function exact(string $total, array $debts): array
    {
        $result = [];
        $sum = '0.00';
        foreach ($debts as $debt) {
            $value = $this->requireValue($debt);
            $sum = bcadd($sum, $value, 2);
            $result[] = ['payerId' => $debt->payerId, 'amount' => bcadd($value, '0', 2), 'splitValue' => null];
        }

        if (0 !== bccomp($sum, $total, 2)) {
            throw new BadRequestHttpException('Debts amount sum must be equal to expense amount.');
        }

        return $result;
    }

    /**
     * @param list<ExpenseDebtRequest> $debts
     *
     * @return list<array{payerId: int, amount: string, splitValue: ?string}>
     */
    private function percentage(string $total, array $debts): array
    {
        $weights = [];
        $percentTotal = '0.00';
        foreach ($debts as $debt) {
            $value = $this->requireValue($debt);
            $weights[] = $value;
            $percentTotal = bcadd($percentTotal, $value, 2);
        }

        if (0 !== bccomp($percentTotal, '100', 2)) {
            throw new BadRequestHttpException('Split percentages must total 100.');
        }

        return $this->assign($total, $debts, $weights, true);
    }

    /**
     * @param list<ExpenseDebtRequest> $debts
     *
     * @return list<array{payerId: int, amount: string, splitValue: ?string}>
     */
    private function shares(string $total, array $debts): array
    {
        $weights = [];
        foreach ($debts as $debt) {
            $weights[] = $this->requireValue($debt);
        }

        return $this->assign($total, $debts, $weights, true);
    }

    /**
     * @param list<ExpenseDebtRequest> $debts
     *
     * @return list<array{payerId: int, amount: string, splitValue: ?string}>
     */
    private function equal(string $total, array $debts): array
    {
        $weights = array_fill(0, count($debts), '1');

        return $this->assign($total, $debts, $weights, false);
    }

    /**
     * Distributes the total across debtors proportionally to their weights using the
     * largest-remainder method, so the per-cent amounts always sum back to the total.
     *
     * @param list<ExpenseDebtRequest> $debts
     * @param list<string>             $weights
     *
     * @return list<array{payerId: int, amount: string, splitValue: ?string}>
     */
    private function assign(string $total, array $debts, array $weights, bool $storeWeight): array
    {
        $weightTotal = '0';
        foreach ($weights as $weight) {
            $weightTotal = bcadd($weightTotal, $weight, 6);
        }

        if (0 === bccomp($weightTotal, '0', 6)) {
            throw new BadRequestHttpException('Split weights must be greater than zero.');
        }

        $totalCents = bcmul($total, '100', 0);

        $floors = [];
        $remainders = [];
        $assignedCents = '0';
        foreach ($weights as $index => $weight) {
            $ideal = bcdiv(bcmul((string) $totalCents, $weight, 6), $weightTotal, 6);
            $floor = bcdiv($ideal, '1', 0);
            $floors[$index] = $floor;
            $remainders[$index] = bcsub($ideal, $floor, 6);
            $assignedCents = bcadd($assignedCents, $floor, 0);
        }

        $leftover = (int) bcsub((string) $totalCents, $assignedCents, 0);

        $order = array_keys($remainders);
        usort($order, fn ($a, $b) => bccomp($remainders[$b], $remainders[$a], 6));
        for ($position = 0; $position < $leftover; ++$position) {
            $floors[$order[$position]] = bcadd($floors[$order[$position]], '1', 0);
        }

        $result = [];
        foreach ($debts as $index => $debt) {
            $result[] = [
                'payerId' => $debt->payerId,
                'amount' => bcdiv($floors[$index], '100', 2),
                'splitValue' => $storeWeight ? bcadd($weights[$index], '0', 2) : null,
            ];
        }

        return $result;
    }

    private function requireValue(ExpenseDebtRequest $debt): string
    {
        if (null === $debt->value) {
            throw new BadRequestHttpException('A split value is required for each debtor.');
        }

        return $debt->value;
    }
}
