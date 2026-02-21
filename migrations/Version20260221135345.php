<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260221135345 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make user password nullable for shadow users';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user CHANGE password password VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('UPDATE user SET password = \'\' WHERE password IS NULL');
        $this->addSql('ALTER TABLE user CHANGE password password VARCHAR(255) NOT NULL');
    }
}
