<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[ORM\HasLifecycleCallbacks]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private string $email;

    /**
     * @var string The hashed password
     */
    #[ORM\Column(nullable: true)]
    private ?string $password = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, Debt>
     */
    #[ORM\OneToMany(targetEntity: Debt::class, mappedBy: 'payer', orphanRemoval: true)]
    private Collection $debts;

    /**
     * @var Collection<int, Expense>
     */
    #[ORM\OneToMany(targetEntity: Expense::class, mappedBy: 'payee', orphanRemoval: true)]
    private Collection $expenses;

    /**
     * @var Collection<int, Transfer>
     */
    #[ORM\OneToMany(targetEntity: Transfer::class, mappedBy: 'payer', orphanRemoval: true)]
    private Collection $transfersSent;

    /**
     * @var Collection<int, Transfer>
     */
    #[ORM\OneToMany(targetEntity: Transfer::class, mappedBy: 'payee', orphanRemoval: true)]
    private Collection $transfersReceived;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->debts = new ArrayCollection();
        $this->expenses = new ArrayCollection();
        $this->transfersSent = new ArrayCollection();
        $this->transfersReceived = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     *
     * @return list<string>
     */
    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(?string $password): static
    {
        $this->password = $password;

        return $this;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
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

    /**
     * @return Collection<int, Debt>
     */
    public function getDebts(): Collection
    {
        return $this->debts;
    }

    public function addDebt(Debt $debt): static
    {
        if ($debt->getPayer() !== $this) {
            throw new \InvalidArgumentException('Debt payer must be the same as the User');
        }

        if (!$this->debts->contains($debt)) {
            $this->debts->add($debt);
        }

        return $this;
    }

    /**
     * @return Collection<int, Expense>
     */
    public function getExpenses(): Collection
    {
        return $this->expenses;
    }

    public function addExpense(Expense $expense): static
    {
        if ($expense->getPayee() !== $this) {
            throw new \InvalidArgumentException('Expense payee must be the same as the User');
        }

        if (!$this->expenses->contains($expense)) {
            $this->expenses->add($expense);
        }

        return $this;
    }

    /**
     * @return Collection<int, Transfer>
     */
    public function getTransfersSent(): Collection
    {
        return $this->transfersSent;
    }

    public function addTransferSent(Transfer $transfer): static
    {
        if ($transfer->getPayer() !== $this) {
            throw new \InvalidArgumentException('Transfer payer must be the same as the User');
        }

        if (!$this->transfersSent->contains($transfer)) {
            $this->transfersSent->add($transfer);
        }

        return $this;
    }

    /**
     * @return Collection<int, Transfer>
     */
    public function getTransfersReceived(): Collection
    {
        return $this->transfersReceived;
    }

    public function addTransferReceived(Transfer $transfer): static
    {
        if ($transfer->getPayee() !== $this) {
            throw new \InvalidArgumentException('Transfer payee must be the same as the User');
        }

        if (!$this->transfersReceived->contains($transfer)) {
            $this->transfersReceived->add($transfer);
        }

        return $this;
    }
}
