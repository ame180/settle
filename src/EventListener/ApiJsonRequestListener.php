<?php

declare(strict_types=1);

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Exception\UnsupportedMediaTypeHttpException;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Makes every /api request behave as a JSON API: errors render as
 * application/problem+json and request bodies must be JSON. Rejecting
 * form-encoded bodies, together with the SameSite=Lax session cookie,
 * is what protects the API against cross-site request forgery.
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 64)]
class ApiJsonRequestListener
{
    private const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function __invoke(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $request->setRequestFormat('json');

        if (!in_array($request->getMethod(), self::MUTATING_METHODS, true)) {
            return;
        }

        if ('' === $request->getContent() && 0 === $request->request->count()) {
            return;
        }

        if ('json' !== $request->getContentTypeFormat()) {
            throw new UnsupportedMediaTypeHttpException('Request body must be application/json.');
        }
    }
}
