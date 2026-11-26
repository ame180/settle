<?php

declare(strict_types=1);

namespace App\Dto;

use App\Enum\RepeatUnit;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

readonly class RepeatRequest
{
    /**
     * Weekly, every 2 weeks, monthly and yearly for now. Custom intervals only loosen this list.
     */
    private const array ALLOWED_EVERY = [
        RepeatUnit::Week->value => [1, 2],
        RepeatUnit::Month->value => [1],
        RepeatUnit::Year->value => [1],
    ];

    public function __construct(
        public RepeatUnit $unit,

        #[Assert\Positive]
        public int $every = 1,
    ) {
    }

    #[Assert\Callback]
    public function validateFrequency(ExecutionContextInterface $context): void
    {
        if (in_array($this->every, self::ALLOWED_EVERY[$this->unit->value], true)) {
            return;
        }

        $context->buildViolation('This repeat frequency is not supported.')
            ->atPath('every')
            ->addViolation();
    }
}
