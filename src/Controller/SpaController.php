<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class SpaController extends AbstractController
{
    public function __construct(
        private readonly string $indexPath,
    ) {
    }

    #[Route('/{path}', name: 'spa', requirements: ['path' => '^(?!api(/|$)|_(profiler|wdt)(/|$)).*'], methods: ['GET'], priority: -100)]
    public function index(): Response
    {
        if (!is_file($this->indexPath)) {
            return new Response(
                '<!doctype html><title>Settle</title><p>Frontend build not found. Run <code>npm run dev</code> in <code>frontend/</code> for development or <code>npm run build</code> for a production bundle.</p>',
                Response::HTTP_SERVICE_UNAVAILABLE,
                ['Content-Type' => 'text/html; charset=UTF-8'],
            );
        }

        return new Response(
            (string) file_get_contents($this->indexPath),
            Response::HTTP_OK,
            ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-store'],
        );
    }
}
