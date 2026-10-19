<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\Expense;
use App\Enum\SplitType;

readonly class ExpenseResponse
{
    /**
     * @param list<ExpenseDebtResponse> $debts
     */
    public function __construct(
        public int $id,
        public string $title,
        public ?string $description,
        public string $amount,
        public string $currency,
        public PersonRef $payee,
        public \DateTimeImmutable $occurredOn,
        public SplitType $splitType,
        public array $debts,
    ) {
    }

    /**
     * @param array<int, PersonRef> $people keyed by user id, must cover the payee and every debtor
     */
    public static function fromExpense(Expense $expense, array $people): self
    {
        $debts = array_map(
            fn ($debt) => new ExpenseDebtResponse(
                payer: $people[$debt->getPayer()->getId()],
                amount: $debt->getAmount(),
                splitValue: $debt->getSplitValue(),
            ),
            $expense->getDebts()->toArray()
        );

        return new self(
            id: $expense->getId(),
            title: $expense->getTitle(),
            description: $expense->getDescription(),
            amount: $expense->getAmount(),
            currency: $expense->getCurrency(),
            payee: $people[$expense->getPayee()->getId()],
            occurredOn: $expense->getOccurredOn(),
            splitType: $expense->getSplitType(),
            debts: array_values($debts),
        );
    }
}
