<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20250208163712 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create debt table, need to add expense relation in future';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            'CREATE TABLE debt (id INT AUTO_INCREMENT NOT NULL, payer_id INT NOT NULL, amount NUMERIC(10, 2) NOT NULL, INDEX IDX_DBBF0A83C17AD9A9 (payer_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB'
        );
        $this->addSql(
            'ALTER TABLE debt ADD CONSTRAINT FK_DBBF0A83C17AD9A9 FOREIGN KEY (payer_id) REFERENCES user (id)'
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE debt DROP FOREIGN KEY FK_DBBF0A83C17AD9A9');
        $this->addSql('DROP TABLE debt');
    }
}
