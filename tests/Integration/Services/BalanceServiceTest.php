<?php

declare(strict_types=1);

namespace App\Tests\Integration\Services;

use App\Dto\CurrencyAmount;
use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\Transfer;
use App\Entity\User;
use App\Services\BalanceService;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class BalanceServiceTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;
    private BalanceService $balanceService;

    protected function setUp(): void
    {
        self::bootKernel();

        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->balanceService = static::getContainer()->get(BalanceService::class);
    }

    public function testNoActivityGivesNoBalances(): void
    {
        $user = $this->persistUser();
        $this->entityManager->flush();

        $balances = $this->balanceService->getBalancesByCounterpart($user);

        $this->assertSame([], $balances);
        $this->assertSame([], $this->balanceService->sumTotals($balances));
    }

    public function testSumsWithoutFloatDrift(): void
    {
        $user = $this->persistUser();
        $friend = $this->persistUser();

        for ($i = 0; $i < 1000; ++$i) {
            $this->persistExpense($user, [[$friend, '0.10']]);
        }
        $this->entityManager->flush();

        $this->assertSame(
            [(int) $friend->getId() => [['PLN', '100.00']]],
            $this->flatten($this->balanceService->getBalancesByCounterpart($user))
        );
    }

    public function testMutualExpensesNetOutAndSelfShareIsIgnored(): void
    {
        $user1 = $this->persistUser();
        $user2 = $this->persistUser();

        $this->persistExpense($user1, [[$user1, '5.00'], [$user2, '5.00']]);
        $this->persistExpense($user2, [[$user1, '10.00']]);
        $this->persistExpense($user1, [[$user1, '10.00']]);
        $this->entityManager->flush();

        $this->assertSame(
            [(int) $user2->getId() => [['PLN', '-5.00']]],
            $this->flatten($this->balanceService->getBalancesByCounterpart($user1))
        );
        $this->assertSame(
            [(int) $user1->getId() => [['PLN', '5.00']]],
            $this->flatten($this->balanceService->getBalancesByCounterpart($user2))
        );
    }

    public function testTransferSettlesDebtToZeroButKeepsCounterpart(): void
    {
        $debtor = $this->persistUser();
        $creditor = $this->persistUser();

        $this->persistExpense($creditor, [[$debtor, '10.00']]);
        $this->entityManager->persist(new Transfer($debtor, $creditor, '10.00', new \DateTimeImmutable('2026-01-02')));
        $this->entityManager->flush();

        $balances = $this->balanceService->getBalancesByCounterpart($debtor);

        $this->assertSame([(int) $creditor->getId() => []], $this->flatten($balances));
        $this->assertSame([], $this->balanceService->sumTotals($balances));
    }

    public function testTransferWithoutExpenseMovesBalanceTowardsSender(): void
    {
        $payer = $this->persistUser();
        $payee = $this->persistUser();

        $this->entityManager->persist(new Transfer($payer, $payee, '10.00', new \DateTimeImmutable('2026-01-01')));
        $this->entityManager->flush();

        $this->assertSame(
            [(int) $payee->getId() => [['PLN', '10.00']]],
            $this->flatten($this->balanceService->getBalancesByCounterpart($payer))
        );
        $this->assertSame(
            [(int) $payer->getId() => [['PLN', '-10.00']]],
            $this->flatten($this->balanceService->getBalancesByCounterpart($payee))
        );
    }

    public function testCurrenciesAreKeptApartAndTotalled(): void
    {
        $user = $this->persistUser();
        $friend1 = $this->persistUser();
        $friend2 = $this->persistUser();

        $this->persistExpense($user, [[$friend1, '10.00']], 'EUR');
        $this->persistExpense($user, [[$friend1, '20.00']]);
        $this->persistExpense($friend2, [[$user, '5.00']], 'EUR');
        $this->entityManager->flush();

        $balances = $this->balanceService->getBalancesByCounterpart($user);

        $this->assertSame(
            [
                (int) $friend1->getId() => [['EUR', '10.00'], ['PLN', '20.00']],
                (int) $friend2->getId() => [['EUR', '-5.00']],
            ],
            $this->flatten($balances)
        );
        $this->assertSame(
            [['EUR', '5.00'], ['PLN', '20.00']],
            array_map(static fn (CurrencyAmount $total): array => [$total->currency, $total->amount], $this->balanceService->sumTotals($balances))
        );
    }

    private function persistUser(): User
    {
        $user = UserFactory::createUser();
        $this->entityManager->persist($user);

        return $user;
    }

    /**
     * @param list<array{User, string}> $debts
     */
    private function persistExpense(User $payee, array $debts, string $currency = 'PLN'): void
    {
        $total = array_reduce($debts, static fn (string $sum, array $debt): string => bcadd($sum, $debt[1], 2), '0.00');

        $expense = new Expense($payee, 'Expense', null, $total, new \DateTimeImmutable('2026-01-01'), $currency);
        $this->entityManager->persist($expense);

        foreach ($debts as [$debtor, $amount]) {
            $debt = new Debt($debtor, $expense, $amount, $currency);
            $expense->addDebt($debt);
            $this->entityManager->persist($debt);
        }
    }

    /**
     * @param array<int, list<CurrencyAmount>> $balances
     *
     * @return array<int, list<array{string, string}>>
     */
    private function flatten(array $balances): array
    {
        ksort($balances);

        return array_map(
            static fn (array $amounts): array => array_map(static fn (CurrencyAmount $amount): array => [$amount->currency, $amount->amount], $amounts),
            $balances
        );
    }
}
