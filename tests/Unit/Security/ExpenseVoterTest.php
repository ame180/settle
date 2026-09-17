<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Entity\Debt;
use App\Entity\Expense;
use App\Security\Voter\ExpenseVoter;
use App\Tests\Support\Factory\UserFactory;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\NullToken;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

class ExpenseVoterTest extends TestCase
{
    /**
     * @dataProvider attributeProvider
     */
    public function testGrantsInvolvedUsersAndDeniesOthers(string $attribute): void
    {
        $payee = UserFactory::createUser();
        $debtor = UserFactory::createUser();
        $stranger = UserFactory::createUser();

        $expense = new Expense($payee, 'Dinner', null, '10.00', new \DateTimeImmutable());
        $expense->addDebt(new Debt($debtor, $expense, '10.00'));

        $voter = new ExpenseVoter();

        $this->assertSame(VoterInterface::ACCESS_GRANTED, $voter->vote(new UsernamePasswordToken($payee, 'main'), $expense, [$attribute]));
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $voter->vote(new UsernamePasswordToken($debtor, 'main'), $expense, [$attribute]));
        $this->assertSame(VoterInterface::ACCESS_DENIED, $voter->vote(new UsernamePasswordToken($stranger, 'main'), $expense, [$attribute]));
        $this->assertSame(VoterInterface::ACCESS_DENIED, $voter->vote(new NullToken(), $expense, [$attribute]));
    }

    public function testAbstainsOnUnrelatedAttributeOrSubject(): void
    {
        $user = UserFactory::createUser();
        $expense = new Expense($user, 'Dinner', null, '10.00', new \DateTimeImmutable());
        $voter = new ExpenseVoter();

        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $voter->vote(new UsernamePasswordToken($user, 'main'), $expense, ['ROLE_USER']));
        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $voter->vote(new UsernamePasswordToken($user, 'main'), new \stdClass(), [ExpenseVoter::VIEW]));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function attributeProvider(): array
    {
        return [
            'view' => [ExpenseVoter::VIEW],
            'edit' => [ExpenseVoter::EDIT],
            'delete' => [ExpenseVoter::DELETE],
        ];
    }
}
