<?php

declare(strict_types=1);

namespace App\Validator\Constraints;

use Symfony\Component\Validator\Attribute\HasNamedArguments;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Constraints\Compound;

#[\Attribute(\Attribute::TARGET_PROPERTY | \Attribute::TARGET_METHOD | \Attribute::IS_REPEATABLE)]
final class Decimal extends Compound
{
    #[HasNamedArguments]
    public function __construct(
        public readonly int $scale = 2,
        public readonly int $precision = 10,
        ?array $groups = null,
        mixed $payload = null,
    ) {
        if ($scale <= 0) {
            throw new \InvalidArgumentException('Scale must be greater than 0.');
        }

        if ($precision <= $scale) {
            throw new \InvalidArgumentException('Precision must be greater than scale.');
        }

        parent::__construct(null, $groups, $payload);
    }

    protected function getConstraints(array $options): array
    {
        $integerDigits = $this->precision - $this->scale;

        return [
            new Assert\Type('numeric'),
            new Assert\Regex(
                pattern: sprintf('/^-?\d+(?:\.\d{1,%d})?$/', $this->scale),
                message: sprintf('This value must be a number with at most %d decimal places.', $this->scale),
            ),
            new Assert\Regex(
                pattern: sprintf('/^-?\d{1,%d}(?:\.|$)/', $integerDigits),
                message: sprintf('This value must have at most %d digits before the decimal point.', $integerDigits),
            ),
        ];
    }
}
