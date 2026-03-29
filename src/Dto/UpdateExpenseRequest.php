<?php

declare(strict_types=1);

namespace App\Dto;

use App\Validator\Constraints\Decimal;
use Symfony\Component\Validator\Constraints as Assert;

readonly class UpdateExpenseRequest
{
    /**
     * @param list<CreateExpenseDebtRequest> $debts
     */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 255)]
        public string $title,

        #[Assert\Positive]
        #[Decimal(scale: 2)]
        public string $amount,

        #[Assert\Positive]
        public int $payeeId,

        #[Assert\NotNull]
        #[Assert\Count(min: 1)]
        #[Assert\All([
            new Assert\Type(type: CreateExpenseDebtRequest::class),
        ])]
        #[Assert\Valid]
        public array $debts,

        public \DateTimeImmutable $occurredOn,

        public ?string $description = null,
    ) {
    }
}
