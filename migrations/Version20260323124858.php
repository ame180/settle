<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260323124858 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add occurred_on date column to expense table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense ADD occurred_on DATE NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense DROP occurred_on');
    }
}
