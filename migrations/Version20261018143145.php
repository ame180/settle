<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261018143145 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add contact table and user name';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE contact (id INT AUTO_INCREMENT NOT NULL, owner_id INT NOT NULL, user_id INT NOT NULL, nickname VARCHAR(64) DEFAULT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_4C62E6387E3C61F9 (owner_id), INDEX IDX_4C62E638A76ED395 (user_id), UNIQUE INDEX UNIQ_CONTACT_OWNER_USER (owner_id, user_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE contact ADD CONSTRAINT FK_4C62E6387E3C61F9 FOREIGN KEY (owner_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE contact ADD CONSTRAINT FK_4C62E638A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE user ADD name VARCHAR(64) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE contact DROP FOREIGN KEY FK_4C62E6387E3C61F9');
        $this->addSql('ALTER TABLE contact DROP FOREIGN KEY FK_4C62E638A76ED395');
        $this->addSql('DROP TABLE contact');
        $this->addSql('ALTER TABLE user DROP COLUMN name');
    }
}
