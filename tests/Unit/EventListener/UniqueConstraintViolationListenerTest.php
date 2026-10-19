<?php

declare(strict_types=1);

namespace App\Tests\Unit\EventListener;

use App\EventListener\UniqueConstraintViolationListener;
use Doctrine\DBAL\Driver\Exception as DriverException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\HttpKernelInterface;

class UniqueConstraintViolationListenerTest extends TestCase
{
    public function testConvertsUniqueConstraintViolationToConflict(): void
    {
        $violation = new UniqueConstraintViolationException($this->createStub(DriverException::class), null);
        $event = $this->createEvent($violation);

        (new UniqueConstraintViolationListener())($event);

        $this->assertInstanceOf(ConflictHttpException::class, $event->getThrowable());
        $this->assertSame($violation, $event->getThrowable()->getPrevious());
    }

    public function testLeavesOtherExceptionsUntouched(): void
    {
        $exception = new \RuntimeException('Something else');
        $event = $this->createEvent($exception);

        (new UniqueConstraintViolationListener())($event);

        $this->assertSame($exception, $event->getThrowable());
    }

    private function createEvent(\Throwable $throwable): ExceptionEvent
    {
        return new ExceptionEvent(
            $this->createStub(HttpKernelInterface::class),
            Request::create('/api/contacts', 'POST'),
            HttpKernelInterface::MAIN_REQUEST,
            $throwable,
        );
    }
}
