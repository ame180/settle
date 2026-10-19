<?php

declare(strict_types=1);

namespace App\EventListener;

use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Concurrent requests can both pass an "already exists?" check and race on the insert
 * (e.g. a double-submitted form). The loser gets a 409 instead of a 500.
 */
#[AsEventListener(event: KernelEvents::EXCEPTION)]
class UniqueConstraintViolationListener
{
    public function __invoke(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();
        if (!$exception instanceof UniqueConstraintViolationException) {
            return;
        }

        $event->setThrowable(new ConflictHttpException('This was changed by a concurrent request. Please retry.', $exception));
    }
}
