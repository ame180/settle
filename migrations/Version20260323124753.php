<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260323124753 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make expense description column nullable';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense CHANGE description description LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE expense CHANGE description description LONGTEXT NOT NULL DEFAULT ''");
    }
}
