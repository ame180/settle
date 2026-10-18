<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\CurrencyAmount;
use App\Entity\Debt;
use App\Entity\Transfer;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Single place for balance aggregation. Anything that moves money (debts, transfers)
 * has to be reflected here and in the activity feed UNION in ActivityFeedService.
 */
class BalanceService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Net balance with every pairwise counterpart, per currency, from the user's perspective:
     * positive = the counterpart owes the user. Counterparts whose balance nets to zero are
     * included with an empty list.
     *
     * @return array<int, list<CurrencyAmount>> keyed by counterpart user id
     */
    public function getBalancesByCounterpart(User $user): array
    {
        $amounts = [];
        foreach ([...$this->fetchDebtRows($user), ...$this->fetchTransferRows($user)] as $row) {
            $counterpartId = (int) $row['counterpartId'];
            $currency = $row['currency'];
            $current = $amounts[$counterpartId][$currency] ?? '0.00';

            $amounts[$counterpartId][$currency] = bcadd($current, (string) $row['amount'], 2);
        }

        return array_map($this->toCurrencyAmounts(...), $amounts);
    }

    /**
     * @param array<int, list<CurrencyAmount>> $balancesByCounterpart
     *
     * @return list<CurrencyAmount>
     */
    public function sumTotals(array $balancesByCounterpart): array
    {
        $totals = [];
        foreach ($balancesByCounterpart as $balances) {
            foreach ($balances as $balance) {
                $totals[$balance->currency] = bcadd($totals[$balance->currency] ?? '0.00', $balance->amount, 2);
            }
        }

        return $this->toCurrencyAmounts($totals);
    }

    /**
     * Debts between the payee of an expense and each of its debtors. A payee's own share is
     * not a debt to anyone, and co-debtors owe each other nothing.
     *
     * @return list<array{counterpartId: int|string, currency: string, amount: string}>
     */
    private function fetchDebtRows(User $user): array
    {
        /** @var list<array{counterpartId: int|string, currency: string, amount: string}> $rows */
        $rows = $this->entityManager->createQueryBuilder()
            ->select(
                'CASE WHEN e.payee = :user THEN IDENTITY(d.payer) ELSE IDENTITY(e.payee) END AS counterpartId',
                'd.currency AS currency',
                'SUM(CASE WHEN e.payee = :user THEN d.amount ELSE 0 - d.amount END) AS amount',
            )
            ->from(Debt::class, 'd')
            ->join('d.expense', 'e')
            ->where('e.payee = :user OR d.payer = :user')
            ->andWhere('d.payer != e.payee')
            ->groupBy('counterpartId')
            ->addGroupBy('currency')
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        return $rows;
    }

    /**
     * Sending money to someone moves the balance in the sender's favour.
     *
     * @return list<array{counterpartId: int|string, currency: string, amount: string}>
     */
    private function fetchTransferRows(User $user): array
    {
        /** @var list<array{counterpartId: int|string, currency: string, amount: string}> $rows */
        $rows = $this->entityManager->createQueryBuilder()
            ->select(
                'CASE WHEN t.payer = :user THEN IDENTITY(t.payee) ELSE IDENTITY(t.payer) END AS counterpartId',
                't.currency AS currency',
                'SUM(CASE WHEN t.payer = :user THEN t.amount ELSE 0 - t.amount END) AS amount',
            )
            ->from(Transfer::class, 't')
            ->where('t.payer = :user OR t.payee = :user')
            ->groupBy('counterpartId')
            ->addGroupBy('currency')
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        return $rows;
    }

    /**
     * @param array<string, string> $amountsByCurrency
     *
     * @return list<CurrencyAmount>
     */
    private function toCurrencyAmounts(array $amountsByCurrency): array
    {
        ksort($amountsByCurrency);

        $result = [];
        foreach ($amountsByCurrency as $currency => $amount) {
            if (0 === bccomp($amount, '0', 2)) {
                continue;
            }

            $result[] = new CurrencyAmount((string) $currency, $amount);
        }

        return $result;
    }
}
