<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260619230828 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add split_type to expense and split_value to debt';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense ADD split_type VARCHAR(16) NOT NULL DEFAULT \'exact\'');
        $this->addSql('ALTER TABLE debt ADD split_value DECIMAL(10, 2) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense DROP COLUMN split_type');
        $this->addSql('ALTER TABLE debt DROP COLUMN split_value');
    }
}
