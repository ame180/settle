<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Entity\Transfer;
use App\Security\Voter\TransferVoter;
use App\Tests\Support\Factory\UserFactory;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\NullToken;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

class TransferVoterTest extends TestCase
{
    /**
     * @dataProvider attributeProvider
     */
    public function testGrantsPartiesAndDeniesOthers(string $attribute): void
    {
        $payer = UserFactory::createUser();
        $payee = UserFactory::createUser();
        $stranger = UserFactory::createUser();

        $transfer = new Transfer($payer, $payee, '10.00', new \DateTimeImmutable());
        $voter = new TransferVoter();

        $this->assertSame(VoterInterface::ACCESS_GRANTED, $voter->vote(new UsernamePasswordToken($payer, 'main'), $transfer, [$attribute]));
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $voter->vote(new UsernamePasswordToken($payee, 'main'), $transfer, [$attribute]));
        $this->assertSame(VoterInterface::ACCESS_DENIED, $voter->vote(new UsernamePasswordToken($stranger, 'main'), $transfer, [$attribute]));
        $this->assertSame(VoterInterface::ACCESS_DENIED, $voter->vote(new NullToken(), $transfer, [$attribute]));
    }

    public function testAbstainsOnUnrelatedAttributeOrSubject(): void
    {
        $user = UserFactory::createUser();
        $transfer = new Transfer($user, UserFactory::createUser(), '10.00', new \DateTimeImmutable());
        $voter = new TransferVoter();

        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $voter->vote(new UsernamePasswordToken($user, 'main'), $transfer, ['ROLE_USER']));
        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $voter->vote(new UsernamePasswordToken($user, 'main'), new \stdClass(), [TransferVoter::EDIT]));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function attributeProvider(): array
    {
        return [
            'edit' => [TransferVoter::EDIT],
            'delete' => [TransferVoter::DELETE],
        ];
    }
}
