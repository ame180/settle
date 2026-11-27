<?php

declare(strict_types=1);

namespace App\Services\Splitwise;

use App\Dto\SplitwiseImportPreview;
use App\Dto\SplitwiseImportSummary;
use App\Entity\Debt;
use App\Entity\Expense;
use App\Entity\Transfer;
use App\Entity\User;
use App\Enum\SplitType;
use App\Repository\ExpenseRepository;
use App\Repository\TransferRepository;
use App\Services\BalanceService;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Imports a Splitwise friend export between the user and one contact. Only PLN rows are imported
 * (the app shows PLN balances only); net-zero rows and rows the pair already has are skipped.
 */
class SplitwiseImportService
{
    private const string CURRENCY = 'PLN';
    private const int TITLE_MAX_LENGTH = 255;
    private const string AMOUNT = '/^-?\d+(\.\d{1,2})?$/';
    private const string MAX_AMOUNT = '99999999.99';

    public function __construct(
        private readonly SplitwiseCsvParser $parser,
        private readonly SplitwiseCategoryMapper $categoryMapper,
        private readonly ExpenseRepository $expenseRepository,
        private readonly TransferRepository $transferRepository,
        private readonly BalanceService $balanceService,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function preview(User $user, User $contact, string $csv): SplitwiseImportPreview
    {
        $export = $this->read($csv);
        $existing = $this->existingKeyCounts($user, $contact);
        $balance = $this->currentBalance($user, $contact);

        return new SplitwiseImportPreview(
            names: $export->names,
            mismatch: $this->totalMismatch($export),
            options: [
                $this->summarize($balance, $this->plan($export, $user, $contact, 0, $existing)),
                $this->summarize($balance, $this->plan($export, $user, $contact, 1, $existing)),
            ],
        );
    }

    /**
     * @param 0|1 $ownColumn
     */
    public function import(User $user, User $contact, string $csv, int $ownColumn): SplitwiseImportSummary
    {
        $plan = $this->plan($this->read($csv), $user, $contact, $ownColumn, $this->existingKeyCounts($user, $contact));
        $summary = $this->summarize($this->currentBalance($user, $contact), $plan);

        $this->entityManager->wrapInTransaction(function () use ($plan): void {
            foreach ($plan['items'] as $item) {
                $this->entityManager->persist($item);
                if ($item instanceof Expense) {
                    array_map($this->entityManager->persist(...), $item->getDebts()->toArray());
                }
            }
        });

        return $summary;
    }

    /**
     * A row the pair already has is skipped as many times as the pair has it, so re-importing is
     * harmless while repeated rows within one file still import.
     *
     * @param 0|1                $ownColumn
     * @param array<string, int> $existing  counts of the pair's existing rows by dedupe key
     *
     * @return array{items: list<Expense|Transfer>, skipped: int, ownNet: string}
     */
    private function plan(SplitwiseExport $export, User $user, User $contact, int $ownColumn, array $existing): array
    {
        $people = 0 === $ownColumn ? [$user, $contact] : [$contact, $user];

        $items = [];
        $skipped = 0;
        $ownNet = '0.00';
        foreach ($export->rows as $row) {
            $net = bcadd($row->nets[0], '0', 2);
            if (self::CURRENCY !== $row->currency || 0 === bccomp($net, '0', 2)) {
                ++$skipped;
                continue;
            }

            $owedColumn = bccomp($net, '0', 2) > 0 ? 0 : 1;
            $owed = $people[$owedColumn];
            $owing = $people[1 - $owedColumn];
            $absoluteNet = ltrim($net, '-');

            $isPayment = $this->categoryMapper->isPayment($row->category);
            $key = $isPayment
                ? $this->transferKey($row->date, $absoluteNet, $owed, $owing)
                : $this->expenseKey($row->date, bcadd($row->cost, '0', 2), $owed, $this->title($row->description));

            if (($existing[$key] ?? 0) > 0) {
                --$existing[$key];
                ++$skipped;
                continue;
            }

            $items[] = $isPayment
                ? new Transfer($owed, $owing, $absoluteNet, $row->date, null, self::CURRENCY)
                : $this->buildExpense($row, $owed, $owing, $absoluteNet);
            $ownNet = bcadd($ownNet, bcadd($row->nets[$ownColumn], '0', 2), 2);
        }

        return ['items' => $items, 'skipped' => $skipped, 'ownNet' => $ownNet];
    }

    /**
     * The export has only each side's net, not who paid; booking it as the owed person paying the
     * whole cost keeps the balance right.
     */
    private function buildExpense(SplitwiseRow $row, User $payee, User $debtor, string $debtorShare): Expense
    {
        $cost = bcadd($row->cost, '0', 2);
        $expense = new Expense(
            $payee,
            $this->title($row->description),
            null,
            $cost,
            $row->date,
            self::CURRENCY,
            SplitType::Exact,
            $this->categoryMapper->toCategory($row->category),
        );

        $expense->addDebt(new Debt($debtor, $expense, $debtorShare, self::CURRENCY));

        $ownShare = bcsub($cost, $debtorShare, 2);
        if (bccomp($ownShare, '0', 2) > 0) {
            $expense->addDebt(new Debt($payee, $expense, $ownShare, self::CURRENCY));
        }

        return $expense;
    }

    private function read(string $csv): SplitwiseExport
    {
        $export = $this->parser->parse($csv);

        foreach ($export->rows as $row) {
            if (self::CURRENCY === $row->currency && !$this->isImportable($row)) {
                throw new UnsupportedSplitwiseExportException();
            }
        }

        $total = $export->totalsByCurrency[self::CURRENCY] ?? null;
        if (null !== $total && !$this->cancelsOut($total)) {
            throw new UnsupportedSplitwiseExportException();
        }

        return $export;
    }

    private function isImportable(SplitwiseRow $row): bool
    {
        return $this->cancelsOut($row->nets)
            && 1 === preg_match(self::AMOUNT, $row->cost)
            && bccomp($row->cost, '0', 2) >= 0
            && bccomp($row->cost, self::MAX_AMOUNT, 2) <= 0
            && bccomp(ltrim($row->nets[0], '-'), $row->cost, 2) <= 0;
    }

    /**
     * @param array{string, string} $nets
     */
    private function cancelsOut(array $nets): bool
    {
        return 1 === preg_match(self::AMOUNT, $nets[0])
            && 1 === preg_match(self::AMOUNT, $nets[1])
            && 0 === bccomp(bcadd($nets[0], $nets[1], 2), '0', 2);
    }

    /** The file's PLN rows minus its PLN Total balance, from the first person's side; null when they agree. */
    private function totalMismatch(SplitwiseExport $export): ?string
    {
        $difference = bcsub('0', $export->totalsByCurrency[self::CURRENCY][0] ?? '0', 2);
        foreach ($export->rows as $row) {
            if (self::CURRENCY === $row->currency) {
                $difference = bcadd($difference, $row->nets[0], 2);
            }
        }

        return 0 === bccomp($difference, '0', 2) ? null : $difference;
    }

    /**
     * @param array{items: list<Expense|Transfer>, skipped: int, ownNet: string} $plan
     */
    private function summarize(string $currentBalance, array $plan): SplitwiseImportSummary
    {
        $expenses = count(array_filter($plan['items'], static fn (Expense|Transfer $item): bool => $item instanceof Expense));

        return new SplitwiseImportSummary(
            expenses: $expenses,
            transfers: count($plan['items']) - $expenses,
            skipped: $plan['skipped'],
            balance: bcadd($currentBalance, $plan['ownNet'], 2),
        );
    }

    private function currentBalance(User $user, User $contact): string
    {
        $balances = $this->balanceService->getBalancesByCounterpart($user)[(int) $contact->getId()] ?? [];
        foreach ($balances as $balance) {
            if (self::CURRENCY === $balance->currency) {
                return $balance->amount;
            }
        }

        return '0.00';
    }

    /**
     * @return array<string, int>
     */
    private function existingKeyCounts(User $user, User $contact): array
    {
        $keys = [];
        foreach ($this->expenseRepository->findBetweenPair($user, $contact, self::CURRENCY) as $expense) {
            $keys[] = $this->expenseKey($expense->getOccurredOn(), $expense->getAmount(), $expense->getPayee(), trim($expense->getTitle()));
        }

        foreach ($this->transferRepository->findBetweenPair($user, $contact, self::CURRENCY) as $transfer) {
            $keys[] = $this->transferKey($transfer->getOccurredOn(), $transfer->getAmount(), $transfer->getPayer(), $transfer->getPayee());
        }

        return array_count_values($keys);
    }

    /** Transfers match without their text: Splitwise generates it, in the exporting user's language. */
    private function transferKey(\DateTimeImmutable $date, string $amount, User $payer, User $payee): string
    {
        return implode('|', ['transfer', $date->format('Y-m-d'), $amount, $payer->getId(), $payee->getId()]);
    }

    private function expenseKey(\DateTimeImmutable $date, string $amount, User $payee, string $title): string
    {
        return implode('|', ['expense', $date->format('Y-m-d'), $amount, $payee->getId(), $title]);
    }

    private function title(string $description): string
    {
        $title = mb_substr(trim($description), 0, self::TITLE_MAX_LENGTH);

        return '' === $title ? 'Splitwise' : $title;
    }
}
