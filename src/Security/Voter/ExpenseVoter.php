<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Expense;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Expense>
 */
class ExpenseVoter extends Voter
{
    public const VIEW = 'EXPENSE_VIEW';
    public const EDIT = 'EXPENSE_EDIT';
    public const DELETE = 'EXPENSE_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
            && $subject instanceof Expense;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        return $subject->involves($user);
    }
}
