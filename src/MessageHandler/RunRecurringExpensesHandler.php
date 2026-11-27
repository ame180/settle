<?php

declare(strict_types=1);

namespace App\MessageHandler;

use App\Message\RunRecurringExpenses;
use App\Services\RecurringExpenseRunner;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class RunRecurringExpensesHandler
{
    public function __construct(
        private readonly RecurringExpenseRunner $runner,
    ) {
    }

    public function __invoke(RunRecurringExpenses $message): void
    {
        $this->runner->run();
    }
}
