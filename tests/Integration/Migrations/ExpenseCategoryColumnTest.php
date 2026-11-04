<?php

declare(strict_types=1);

namespace App\Tests\Integration\Migrations;

use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ExpenseCategoryColumnTest extends KernelTestCase
{
    public function testRowsWrittenWithoutCategoryGetGeneral(): void
    {
        self::bootKernel();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $connection = $entityManager->getConnection();

        $payee = UserFactory::createUser();
        $entityManager->persist($payee);
        $entityManager->flush();

        $connection->executeStatement(
            "INSERT INTO expense (payee_id, title, amount, currency, occurred_on, created_at, updated_at) VALUES (?, 'Legacy', '10.00', 'PLN', '2026-01-01', NOW(), NOW())",
            [$payee->getId()],
        );

        $category = $connection->fetchOne('SELECT category FROM expense WHERE id = ?', [(int) $connection->lastInsertId()]);

        $this->assertSame('general', $category);
    }
}
