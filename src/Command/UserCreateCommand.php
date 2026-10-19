<?php

declare(strict_types=1);

namespace App\Command;

use App\Exception\EmailAlreadyRegisteredException;
use App\Services\UserRegistrationService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:user:create',
    description: 'Creates a new User',
)]
final class UserCreateCommand extends Command
{
    public function __construct(
        private readonly UserRegistrationService $userRegistrationService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'User email')
            ->addArgument('password', InputArgument::REQUIRED, 'User password');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $email = trim((string) $input->getArgument('email'));
        $password = (string) $input->getArgument('password');

        if (empty($email) || empty($password)) {
            $io->error('Email and password cannot be empty');

            return Command::FAILURE;
        }

        try {
            [, $isClaimingShadowUser] = $this->userRegistrationService->register($email, $password);
        } catch (EmailAlreadyRegisteredException) {
            $io->error('User already exists');

            return Command::FAILURE;
        }

        $io->success($isClaimingShadowUser ? 'Shadow user account claimed successfully' : 'User created successfully');

        return Command::SUCCESS;
    }
}
