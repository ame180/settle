<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260619213045 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create transfer table for settlements between users';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE transfer (id INT AUTO_INCREMENT NOT NULL, payer_id INT NOT NULL, payee_id INT NOT NULL, amount NUMERIC(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL, occurred_on DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\', description LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_4034A3C0C17AD9A9 (payer_id), INDEX IDX_4034A3C0CB4B68F (payee_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE transfer ADD CONSTRAINT FK_4034A3C0C17AD9A9 FOREIGN KEY (payer_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE transfer ADD CONSTRAINT FK_4034A3C0CB4B68F FOREIGN KEY (payee_id) REFERENCES user (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transfer DROP FOREIGN KEY FK_4034A3C0C17AD9A9');
        $this->addSql('ALTER TABLE transfer DROP FOREIGN KEY FK_4034A3C0CB4B68F');
        $this->addSql('DROP TABLE transfer');
    }
}
