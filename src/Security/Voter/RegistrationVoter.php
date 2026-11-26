<?php

declare(strict_types=1);

namespace App\Security\Voter;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, null>
 */
class RegistrationVoter extends Voter
{
    public const REGISTER = 'REGISTER';

    public function __construct(
        #[Autowire(param: 'app.registration_enabled')]
        private readonly bool $registrationEnabled,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return self::REGISTER === $attribute;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        return $this->registrationEnabled;
    }
}
