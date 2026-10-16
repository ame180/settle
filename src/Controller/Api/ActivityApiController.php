<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ActivityQuery;
use App\Entity\User;
use App\Services\ActivityFeedService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class ActivityApiController extends AbstractController
{
    public function __construct(
        private readonly ActivityFeedService $activityFeedService,
    ) {
    }

    #[Route('/activity', name: 'api_activity_list', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function list(
        #[MapQueryString(validationFailedStatusCode: JsonResponse::HTTP_BAD_REQUEST)]
        ActivityQuery $query = new ActivityQuery(),
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json($this->activityFeedService->fetch($user, $query));
    }
}
