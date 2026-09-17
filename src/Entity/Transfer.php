<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TransferRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TransferRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Transfer
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'transfersSent')]
    #[ORM\JoinColumn(nullable: false)]
    private User $payer;

    #[ORM\ManyToOne(inversedBy: 'transfersReceived')]
    #[ORM\JoinColumn(nullable: false)]
    private User $payee;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $amount;

    #[ORM\Column(length: 3)]
    private string $currency;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $occurredOn;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(User $payer, User $payee, string $amount, \DateTimeImmutable $occurredOn, ?string $description = null, string $currency = 'PLN')
    {
        if ($payer === $payee) {
            throw new \InvalidArgumentException('Transfer payer and payee must be different users.');
        }

        $this->payer = $payer;
        $this->payee = $payee;
        $this->occurredOn = $occurredOn;
        $this->description = $description;

        $this->setAmount($amount);
        $this->setCurrency($currency);

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

    public function getPayee(): User
    {
        return $this->payee;
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

    public function getOccurredOn(): \DateTimeImmutable
    {
        return $this->occurredOn;
    }

    public function setOccurredOn(\DateTimeImmutable $occurredOn): static
    {
        $this->occurredOn = $occurredOn;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

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
