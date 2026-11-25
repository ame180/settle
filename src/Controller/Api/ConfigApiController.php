<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ConfigResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class ConfigApiController extends AbstractController
{
    public function __construct(
        #[Autowire(param: 'app.registration_enabled')]
        private readonly bool $registrationEnabled,
    ) {
    }

    #[Route('/config', name: 'api_config', methods: ['GET'])]
    public function config(): JsonResponse
    {
        return $this->json(new ConfigResponse(registrationEnabled: $this->registrationEnabled));
    }
}
