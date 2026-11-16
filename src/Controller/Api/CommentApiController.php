<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\CommentRequest;
use App\Dto\CommentResponse;
use App\Entity\Comment;
use App\Entity\Expense;
use App\Entity\User;
use App\Repository\CommentRepository;
use App\Repository\ExpenseRepository;
use App\Security\Voter\ExpenseVoter;
use App\Services\PersonRefFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
class CommentApiController extends AbstractController
{
    public function __construct(
        private readonly ExpenseRepository $expenseRepository,
        private readonly CommentRepository $commentRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly PersonRefFactory $personRefFactory,
    ) {
    }

    #[Route('/expenses/{id}/comments', name: 'api_expense_comments_list', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_USER')]
    public function list(int $id): JsonResponse
    {
        $expense = $this->findViewableExpense($id);

        /** @var User $user */
        $user = $this->getUser();

        $comments = $this->commentRepository->findByExpenseOldestFirst($expense);
        $authors = $this->personRefFactory->createMany($user, array_map(fn (Comment $comment) => $comment->getAuthor(), $comments));

        return $this->json(array_map(
            fn (Comment $comment) => CommentResponse::fromComment($comment, $authors[(int) $comment->getAuthor()->getId()]),
            $comments,
        ));
    }

    #[Route('/expenses/{id}/comments', name: 'api_expense_comments_create', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_USER')]
    public function create(
        int $id,
        #[MapRequestPayload(acceptFormat: 'json', validationFailedStatusCode: JsonResponse::HTTP_BAD_REQUEST)]
        CommentRequest $request,
    ): JsonResponse {
        $expense = $this->findViewableExpense($id);

        /** @var User $user */
        $user = $this->getUser();

        $comment = new Comment($expense, $user, $request->body);
        $this->entityManager->persist($comment);
        $this->entityManager->flush();

        return $this->json(
            CommentResponse::fromComment($comment, $this->personRefFactory->create($user, $user)),
            JsonResponse::HTTP_CREATED,
        );
    }

    private function findViewableExpense(int $id): Expense
    {
        $expense = $this->expenseRepository->findOneByIdWithDebts($id);
        if (null === $expense) {
            throw $this->createNotFoundException('Expense not found.');
        }

        $this->denyAccessUnlessGranted(ExpenseVoter::VIEW, $expense);

        return $expense;
    }
}
