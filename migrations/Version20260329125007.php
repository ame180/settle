<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260329125007 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add currency column to expense and debt tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense ADD currency VARCHAR(3) NOT NULL DEFAULT \'PLN\'');
        $this->addSql('ALTER TABLE debt ADD currency VARCHAR(3) NOT NULL DEFAULT \'PLN\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense DROP COLUMN currency');
        $this->addSql('ALTER TABLE debt DROP COLUMN currency');
    }
}
