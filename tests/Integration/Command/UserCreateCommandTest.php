<?php

declare(strict_types=1);

namespace App\Tests\Integration\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

class UserCreateCommandTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        self::bootKernel();

        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
    }

    public function testCreateNewUser(): void
    {
        $commandTester = $this->executeCommand('new-user@example.com', 'StrongPassword123!');

        $this->assertSame(Command::SUCCESS, $commandTester->getStatusCode());
        $this->assertStringContainsString('User created successfully', $commandTester->getDisplay());

        $user = $this->entityManager->getRepository(User::class)->findOneBy(['email' => 'new-user@example.com']);
        $this->assertNotNull($user);
        $this->assertNotNull($user->getPassword());
    }

    public function testClaimExistingShadowUser(): void
    {
        $shadowUser = (new User())
            ->setEmail('shadow-user@example.com')
            ->setPassword(null);

        $this->entityManager->persist($shadowUser);
        $this->entityManager->flush();

        $commandTester = $this->executeCommand('shadow-user@example.com', 'StrongPassword123!');

        $this->assertSame(Command::SUCCESS, $commandTester->getStatusCode());
        $this->assertStringContainsString('Shadow user account claimed successfully', $commandTester->getDisplay());

        $claimedUser = $this->entityManager->getRepository(User::class)->findOneBy(['email' => 'shadow-user@example.com']);
        $this->assertNotNull($claimedUser);
        $this->assertSame($shadowUser->getId(), $claimedUser->getId());
        $this->assertNotNull($claimedUser->getPassword());
    }

    public function testFailWhenRegisteredUserExists(): void
    {
        $registeredUser = (new User())
            ->setEmail('existing-user@example.com')
            ->setPassword('existing-hash');

        $this->entityManager->persist($registeredUser);
        $this->entityManager->flush();

        $commandTester = $this->executeCommand('existing-user@example.com', 'StrongPassword123!');

        $this->assertSame(Command::FAILURE, $commandTester->getStatusCode());
        $this->assertStringContainsString('User already exists', $commandTester->getDisplay());
    }

    private function executeCommand(string $email, string $password): CommandTester
    {
        $application = new Application(self::$kernel);
        $command = $application->find('app:user:create');
        $commandTester = new CommandTester($command);
        $commandTester->execute([
            'email' => $email,
            'password' => $password,
        ]);

        return $commandTester;
    }
}
