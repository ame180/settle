<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\DebtRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DebtRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Debt
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'debts')]
    #[ORM\JoinColumn(nullable: false)]
    private User $payer;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $amount;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $splitValue = null;

    #[ORM\Column(length: 3)]
    private string $currency;

    #[ORM\ManyToOne(inversedBy: 'debts')]
    #[ORM\JoinColumn(nullable: false)]
    private Expense $expense;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(User $user, Expense $expense, string $amount, string $currency = 'PLN', ?string $splitValue = null)
    {
        $this->payer = $user;
        $this->expense = $expense;
        $this->setAmount($amount);
        $this->setCurrency($currency);
        $this->setSplitValue($splitValue);
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPayer(): User
    {
        return $this->payer;
    }

    public function getAmount(): string
    {
        return $this->amount;
    }

    public function setAmount(string $amount): static
    {
        $this->amount = bcadd($amount, '0', 2);

        return $this;
    }

    public function getSplitValue(): ?string
    {
        return $this->splitValue;
    }

    public function setSplitValue(?string $splitValue): static
    {
        $this->splitValue = null === $splitValue ? null : bcadd($splitValue, '0', 2);

        return $this;
    }

    public function getExpense(): Expense
    {
        return $this->expense;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function setCurrency(string $currency): static
    {
        if (1 !== preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('Currency must be a 3-letter uppercase ISO 4217 code.');
        }

        $this->currency = $currency;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    public function refreshUpdatedAt(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
