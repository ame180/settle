<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ExpenseRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ExpenseRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Expense
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'expenses')]
    #[ORM\JoinColumn(nullable: false)]
    private User $payee;

    #[ORM\Column(length: 255)]
    private string $title;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $amount;

    #[ORM\Column(length: 3)]
    private string $currency;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $occurredOn;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, Debt>
     */
    #[ORM\OneToMany(targetEntity: Debt::class, mappedBy: 'expense', orphanRemoval: true)]
    private Collection $debts;

    public function __construct(User $payee, string $title, ?string $description, string $amount, \DateTimeImmutable $occurredOn, string $currency = 'PLN')
    {
        $this->payee = $payee;
        $this->title = $title;
        $this->description = $description;

        $this->setAmount($amount);

        $this->occurredOn = $occurredOn;
        $this->setCurrency($currency);
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->debts = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPayee(): User
    {
        return $this->payee;
    }

    public function setPayee(User $payee): static
    {
        $this->payee = $payee;

        return $this;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

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

    public function getAmount(): string
    {
        return $this->amount;
    }

    public function setAmount(string $amount): static
    {
        $this->amount = bcadd($amount, '0', 2);

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

    /**
     * @return Collection<int, Debt>
     */
    public function getDebts(): Collection
    {
        return $this->debts;
    }

    public function addDebt(Debt $debt): static
    {
        if ($debt->getExpense() !== $this) {
            throw new \InvalidArgumentException('Debt expense must be the same as the Expense');
        }

        if ($debt->getCurrency() !== $this->currency) {
            throw new \InvalidArgumentException('Debt currency must match the Expense currency');
        }

        if (!$this->debts->contains($debt)) {
            $this->debts->add($debt);
        }

        return $this;
    }

    public function removeDebt(Debt $debt): static
    {
        $this->debts->removeElement($debt);

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
