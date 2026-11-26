<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ConfigResponse;
use App\Security\Voter\RegistrationVoter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class ConfigApiController extends AbstractController
{
    #[Route('/config', name: 'api_config', methods: ['GET'])]
    public function config(): JsonResponse
    {
        return $this->json(new ConfigResponse(registrationEnabled: $this->isGranted(RegistrationVoter::REGISTER)));
    }
}
