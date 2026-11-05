<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261104165834 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add category to expense';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense ADD category VARCHAR(32) NOT NULL DEFAULT \'general\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense DROP COLUMN category');
    }
}
