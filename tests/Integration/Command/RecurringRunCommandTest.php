<?php

declare(strict_types=1);

namespace App\Tests\Integration\Command;

use App\Dto\ExpenseDebtRequest;
use App\Dto\ExpenseRequest;
use App\Dto\RepeatRequest;
use App\Enum\RepeatUnit;
use App\Services\ExpenseCreateService;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

class RecurringRunCommandTest extends KernelTestCase
{
    use ClockSensitiveTrait;

    public function testCreatesDueExpenses(): void
    {
        $kernel = self::bootKernel();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $user = UserFactory::createUser();
        $entityManager->persist($user);
        $entityManager->flush();

        self::mockTime('2026-11-01');
        static::getContainer()->get(ExpenseCreateService::class)->create($user, new ExpenseRequest(
            title: 'Gym',
            amount: '50.00',
            payeeId: (int) $user->getId(),
            debts: [new ExpenseDebtRequest((int) $user->getId(), '50.00')],
            occurredOn: new \DateTimeImmutable('2026-11-01'),
            repeat: new RepeatRequest(RepeatUnit::Week),
        ));

        self::mockTime('2026-11-15');
        $commandTester = new CommandTester((new Application($kernel))->find('app:recurring:run'));
        $commandTester->execute([]);

        $this->assertSame(Command::SUCCESS, $commandTester->getStatusCode());
        $this->assertStringContainsString('Created 2 repeating expense(s).', $commandTester->getDisplay());
    }
}
