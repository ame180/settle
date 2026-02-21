<?php

declare(strict_types=1);

namespace App\Validator\Constraints;

use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Constraints\Compound;

#[\Attribute(\Attribute::TARGET_PROPERTY | \Attribute::TARGET_METHOD | \Attribute::IS_REPEATABLE)]
final class Decimal extends Compound
{
    public function __construct(
        public readonly int $scale = 2,
        ?array $groups = null,
        mixed $payload = null,
    ) {
        if ($scale <= 0) {
            throw new \InvalidArgumentException('Scale must be greater than 0.');
        }

        parent::__construct([], $groups, $payload);
    }

    protected function getConstraints(array $options): array
    {
        return [
            new Assert\Type('numeric'),
            new Assert\Regex(sprintf('/^-?\\d+(?:\\.\\d{1,%d})?$/', $this->scale)),
        ];
    }
}
