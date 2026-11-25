<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Comment;
use App\Entity\Expense;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Comment>
 */
class CommentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Comment::class);
    }

    /**
     * @return list<Comment>
     */
    public function findByExpenseOldestFirst(Expense $expense): array
    {
        /** @var list<Comment> $comments */
        $comments = $this->createQueryBuilder('comment')
            ->addSelect('author')
            ->join('comment.author', 'author')
            ->where('comment.expense = :expense')
            ->setParameter('expense', $expense)
            ->orderBy('comment.createdAt', \SortDirection::Ascending)
            ->addOrderBy('comment.id', \SortDirection::Ascending)
            ->getQuery()
            ->getResult();

        return $comments;
    }
}
