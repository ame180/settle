<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\ActivityItem;
use App\Dto\ActivityQuery;
use App\Entity\Expense;
use App\Entity\Transfer;
use App\Entity\User;
use App\Enum\ActivityType;
use App\Repository\ExpenseRepository;
use App\Repository\TransferRepository;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\ParameterType;

class ActivityFeedService
{
    public function __construct(
        private readonly Connection $connection,
        private readonly ExpenseRepository $expenseRepository,
        private readonly TransferRepository $transferRepository,
        private readonly UserDebtService $userDebtService,
    ) {
    }

    /**
     * @return list<ActivityItem>
     */
    public function fetch(User $user, ActivityQuery $query): array
    {
        $rows = $this->fetchOrderedRows($user, $query);
        if ([] === $rows) {
            return [];
        }

        $expenseIds = [];
        $transferIds = [];
        foreach ($rows as $row) {
            if (ActivityType::Expense === $row['type']) {
                $expenseIds[] = $row['id'];

                continue;
            }

            $transferIds[] = $row['id'];
        }

        $expenses = $this->indexById($this->expenseRepository->findByIdsWithDebts($expenseIds));
        $transfers = $this->indexById($this->transferRepository->findByIdsWithParties($transferIds));

        $items = [];
        foreach ($rows as $row) {
            $item = ActivityType::Expense === $row['type']
                ? $this->buildExpenseItem($expenses[$row['id']] ?? null, $user)
                : $this->buildTransferItem($transfers[$row['id']] ?? null, $user);

            if (null === $item) {
                continue;
            }

            $items[] = $item;
        }

        return $items;
    }

    /**
     * @return list<array{type: ActivityType, id: int}>
     */
    private function fetchOrderedRows(User $user, ActivityQuery $query): array
    {
        $contactId = $query->contactId;

        if (null === $contactId) {
            $expenseCondition = 'e.payee_id = :userId OR EXISTS (SELECT 1 FROM debt d WHERE d.expense_id = e.id AND d.payer_id = :userId)';
            $transferCondition = 't.payer_id = :userId OR t.payee_id = :userId';
        } else {
            $expenseCondition = '(e.payee_id = :userId AND EXISTS (SELECT 1 FROM debt d WHERE d.expense_id = e.id AND d.payer_id = :contactId))'
                .' OR (e.payee_id = :contactId AND EXISTS (SELECT 1 FROM debt d WHERE d.expense_id = e.id AND d.payer_id = :userId))';
            $transferCondition = '(t.payer_id = :userId AND t.payee_id = :contactId) OR (t.payer_id = :contactId AND t.payee_id = :userId)';
        }

        $sql = <<<SQL
            SELECT 'expense' AS item_type, e.id AS item_id, e.occurred_on AS occurred_on, e.created_at AS created_at
            FROM expense e
            WHERE ($expenseCondition)
            UNION ALL
            SELECT 'transfer' AS item_type, t.id AS item_id, t.occurred_on AS occurred_on, t.created_at AS created_at
            FROM transfer t
            WHERE ($transferCondition)
            ORDER BY occurred_on DESC, created_at DESC, item_id DESC
            LIMIT :limit OFFSET :offset
            SQL;

        $parameters = [
            'userId' => $user->getId(),
            'limit' => $query->limit,
            'offset' => $query->offset,
        ];
        $types = [
            'userId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
            'offset' => ParameterType::INTEGER,
        ];

        if (null !== $contactId) {
            $parameters['contactId'] = $contactId;
            $types['contactId'] = ParameterType::INTEGER;
        }

        $rows = $this->connection->executeQuery($sql, $parameters, $types)->fetchAllAssociative();

        return array_map(
            static fn (array $row): array => [
                'type' => ActivityType::from((string) $row['item_type']),
                'id' => (int) $row['item_id'],
            ],
            $rows
        );
    }

    /**
     * @template T of Expense|Transfer
     *
     * @param list<T> $entities
     *
     * @return array<int, T>
     */
    private function indexById(array $entities): array
    {
        $indexed = [];
        foreach ($entities as $entity) {
            $indexed[(int) $entity->getId()] = $entity;
        }

        return $indexed;
    }

    private function buildExpenseItem(?Expense $expense, User $user): ?ActivityItem
    {
        if (null === $expense) {
            return null;
        }

        return new ActivityItem(
            type: ActivityType::Expense,
            id: (int) $expense->getId(),
            occurredOn: $expense->getOccurredOn(),
            currency: $expense->getCurrency(),
            amount: $expense->getAmount(),
            value: $this->userDebtService->calculateExpenseBalanceForUser($expense, $user),
            title: $expense->getTitle(),
            description: $expense->getDescription(),
            payeeId: (int) $expense->getPayee()->getId(),
            payeeEmail: $expense->getPayee()->getEmail(),
            payerId: null,
            payerEmail: null,
        );
    }

    private function buildTransferItem(?Transfer $transfer, User $user): ?ActivityItem
    {
        if (null === $transfer) {
            return null;
        }

        $amount = $transfer->getAmount();
        $value = $transfer->getPayer()->isSameAs($user)
            ? bcadd($amount, '0', 2)
            : bcsub('0', $amount, 2);

        return new ActivityItem(
            type: ActivityType::Transfer,
            id: (int) $transfer->getId(),
            occurredOn: $transfer->getOccurredOn(),
            currency: $transfer->getCurrency(),
            amount: $amount,
            value: $value,
            title: $transfer->getDescription(),
            description: null,
            payeeId: (int) $transfer->getPayee()->getId(),
            payeeEmail: $transfer->getPayee()->getEmail(),
            payerId: (int) $transfer->getPayer()->getId(),
            payerEmail: $transfer->getPayer()->getEmail(),
        );
    }
}
