<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\Comment;
use App\Entity\Expense;
use App\Tests\Support\Factory\UserFactory;
use PHPUnit\Framework\TestCase;

class CommentTest extends TestCase
{
    private function makeExpense(): Expense
    {
        return new Expense(UserFactory::createUser(), 'Test', null, '10.00', new \DateTimeImmutable());
    }

    public function testBodyIsTrimmed(): void
    {
        $comment = new Comment($this->makeExpense(), UserFactory::createUser(), "  hi\nthere \n");

        $this->assertSame("hi\nthere", $comment->getBody());
    }

    public function testBlankBodyIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        new Comment($this->makeExpense(), UserFactory::createUser(), " \n ");
    }
}
