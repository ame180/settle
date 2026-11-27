<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\RepeatUnit;
use App\Repository\RecurringSeriesRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * The schedule of a repeating expense. The series' latest expense (highest id) is what the next one copies.
 */
#[ORM\Entity(repositoryClass: RecurringSeriesRepository::class)]
#[ORM\Index(name: 'idx_recurring_series_due', columns: ['active', 'next_run_on'])]
#[ORM\HasLifecycleCallbacks]
class RecurringSeries
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 8, enumType: RepeatUnit::class)]
    private RepeatUnit $unit;

    #[ORM\Column(type: Types::SMALLINT)]
    private int $every;

    /** The date the schedule counts from; monthly and yearly repeats keep its day of the month. */
    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $anchorOn;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $nextRunOn;

    #[ORM\Column]
    private bool $active = true;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(RepeatUnit $unit, int $every, \DateTimeImmutable $anchorOn, \DateTimeImmutable $nextRunOn)
    {
        $this->unit = $unit;
        $this->every = $every;
        $this->anchorOn = $anchorOn;
        $this->nextRunOn = $nextRunOn;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUnit(): RepeatUnit
    {
        return $this->unit;
    }

    public function getEvery(): int
    {
        return $this->every;
    }

    public function getAnchorOn(): \DateTimeImmutable
    {
        return $this->anchorOn;
    }

    public function getNextRunOn(): \DateTimeImmutable
    {
        return $this->nextRunOn;
    }

    public function isActive(): bool
    {
        return $this->active;
    }

    public function hasFrequency(RepeatUnit $unit, int $every): bool
    {
        return $this->unit === $unit && $this->every === $every;
    }

    public function reschedule(RepeatUnit $unit, int $every, \DateTimeImmutable $anchorOn, \DateTimeImmutable $nextRunOn): void
    {
        $this->unit = $unit;
        $this->every = $every;
        $this->anchorOn = $anchorOn;
        $this->nextRunOn = $nextRunOn;
        $this->active = true;
    }

    public function advanceTo(\DateTimeImmutable $nextRunOn): void
    {
        $this->nextRunOn = $nextRunOn;
    }

    public function stop(): void
    {
        $this->active = false;
    }

    #[ORM\PreUpdate]
    public function refreshUpdatedAt(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
