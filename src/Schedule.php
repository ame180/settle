<?php

declare(strict_types=1);

namespace App;

use App\Message\RunRecurringExpenses;
use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule as SymfonySchedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;

/**
 * Consumed by the `scheduler` service (`messenger:consume scheduler_default`). The runner keeps
 * no state between ticks, so missed ticks need no replay.
 */
#[AsSchedule]
class Schedule implements ScheduleProviderInterface
{
    public function getSchedule(): SymfonySchedule
    {
        return (new SymfonySchedule())
            ->add(RecurringMessage::every('1 hour', new RunRecurringExpenses()));
    }
}
