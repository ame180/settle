<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ContactRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ContactRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_CONTACT_OWNER_USER', fields: ['owner', 'user'])]
#[ORM\HasLifecycleCallbacks]
class Contact
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private User $owner;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private User $user;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $nickname = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(User $owner, User $user, ?string $nickname = null)
    {
        if ($owner->isSameAs($user)) {
            throw new \InvalidArgumentException('Contact owner and user must be different users.');
        }

        $this->owner = $owner;
        $this->user = $user;
        $this->setNickname($nickname);

        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOwner(): User
    {
        return $this->owner;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getNickname(): ?string
    {
        return $this->nickname;
    }

    public function setNickname(?string $nickname): static
    {
        $nickname = null === $nickname ? null : trim($nickname);
        $this->nickname = '' === $nickname ? null : $nickname;

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
