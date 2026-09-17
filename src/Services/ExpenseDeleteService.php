<?php

declare(strict_types=1);

namespace App\Services;

use App\Entity\Debt;
use App\Entity\Expense;
use Doctrine\ORM\EntityManagerInterface;

class ExpenseDeleteService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function delete(Expense $expense): void
    {
        $existingDebts = $this->entityManager->getRepository(Debt::class)->findBy(['expense' => $expense]);
        foreach ($existingDebts as $debt) {
            $expense->removeDebt($debt);
            $this->entityManager->remove($debt);
        }

        $this->entityManager->remove($expense);
        $this->entityManager->flush();
    }
}
