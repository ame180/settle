<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20250301025225 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Expense Entity and add it as a relation to User and Debt';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE expense (id INT AUTO_INCREMENT NOT NULL, payee_id INT NOT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT NOT NULL, amount NUMERIC(10, 2) NOT NULL, INDEX IDX_2D3A8DA6CB4B68F (payee_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE expense ADD CONSTRAINT FK_2D3A8DA6CB4B68F FOREIGN KEY (payee_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE debt ADD expense_id INT NOT NULL');
        $this->addSql('ALTER TABLE debt ADD CONSTRAINT FK_DBBF0A83F395DB7B FOREIGN KEY (expense_id) REFERENCES expense (id)');
        $this->addSql('CREATE INDEX IDX_DBBF0A83F395DB7B ON debt (expense_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE debt DROP FOREIGN KEY FK_DBBF0A83F395DB7B');
        $this->addSql('ALTER TABLE expense DROP FOREIGN KEY FK_2D3A8DA6CB4B68F');
        $this->addSql('DROP TABLE expense');
        $this->addSql('DROP INDEX IDX_DBBF0A83F395DB7B ON debt');
        $this->addSql('ALTER TABLE debt DROP expense_id');
    }
}
