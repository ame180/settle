<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\Comment;

readonly class CommentResponse
{
    public function __construct(
        public int $id,
        public PersonRef $author,
        public string $body,
        public \DateTimeImmutable $createdAt,
    ) {
    }

    public static function fromComment(Comment $comment, PersonRef $author): self
    {
        return new self(
            id: (int) $comment->getId(),
            author: $author,
            body: $comment->getBody(),
            createdAt: $comment->getCreatedAt(),
        );
    }
}
