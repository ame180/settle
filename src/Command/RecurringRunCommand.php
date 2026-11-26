<?php

declare(strict_types=1);

namespace App\Command;

use App\Services\RecurringExpenseRunner;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:recurring:run',
    description: 'Creates the repeating expenses that are due',
)]
final class RecurringRunCommand extends Command
{
    public function __construct(
        private readonly RecurringExpenseRunner $runner,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $created = $this->runner->run();

        (new SymfonyStyle($input, $output))->success(sprintf('Created %d repeating expense(s).', $created));

        return Command::SUCCESS;
    }
}
