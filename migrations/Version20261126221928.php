<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261126221928 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add recurring_series and link expenses to it';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE recurring_series (id INT AUTO_INCREMENT NOT NULL, unit VARCHAR(8) NOT NULL, every SMALLINT NOT NULL, anchor_on DATE NOT NULL COMMENT '(DC2Type:date_immutable)', next_run_on DATE NOT NULL COMMENT '(DC2Type:date_immutable)', active TINYINT(1) NOT NULL, created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', INDEX idx_recurring_series_due (active, next_run_on), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
        $this->addSql('ALTER TABLE expense ADD series_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE expense ADD CONSTRAINT FK_2D3A8DA65278319C FOREIGN KEY (series_id) REFERENCES recurring_series (id)');
        $this->addSql('CREATE INDEX IDX_2D3A8DA65278319C ON expense (series_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE expense DROP FOREIGN KEY FK_2D3A8DA65278319C');
        $this->addSql('DROP INDEX IDX_2D3A8DA65278319C ON expense');
        $this->addSql('ALTER TABLE expense DROP series_id');
        $this->addSql('DROP TABLE recurring_series');
    }
}
