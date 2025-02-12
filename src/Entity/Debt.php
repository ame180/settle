<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\DebtRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\UX\Turbo\Attribute\Broadcast;

#[ORM\Entity(repositoryClass: DebtRepository::class)]
#[Broadcast]
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

    public function __construct(User $user, string $amount)
    {
        $this->payer = $user;
        $this->setAmount($amount);
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPayer(): User
    {
        return $this->payer;
    }

    public function setPayer(User $payer): static
    {
        $this->payer = $payer;

        return $this;
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
}
