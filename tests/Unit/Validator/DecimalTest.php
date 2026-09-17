<?php

declare(strict_types=1);

namespace App\Tests\Unit\Validator;

use App\Validator\Constraints\Decimal;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class DecimalTest extends TestCase
{
    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        $this->validator = Validation::createValidator();
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function validValuesProvider(): iterable
    {
        yield 'no decimals' => ['100'];
        yield 'one decimal' => ['100.5'];
        yield 'two decimals' => ['100.55'];
        yield 'zero' => ['0'];
        yield 'negative' => ['-42.75'];
        yield 'precision boundary' => ['99999999.99'];
        yield 'precision boundary without decimals' => ['12345678'];
        yield 'precision boundary with one decimal' => ['12345678.5'];
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function invalidValuesProvider(): iterable
    {
        yield 'too many decimals' => ['100.555'];
        yield 'non numeric' => ['abc'];
        yield 'empty string' => [''];
        yield 'trailing dot' => ['100.'];
        yield 'precision overflow with decimals' => ['100000000.00'];
        yield 'precision overflow without decimals' => ['123456789'];
        yield 'negative precision overflow' => ['-123456789.00'];
    }

    /**
     * @dataProvider validValuesProvider
     */
    public function testValidValues(string $value): void
    {
        $violations = $this->validator->validate($value, new Decimal(scale: 2));

        $this->assertCount(0, $violations);
    }

    /**
     * @dataProvider invalidValuesProvider
     */
    public function testInvalidValues(string $value): void
    {
        $violations = $this->validator->validate($value, new Decimal(scale: 2));

        $this->assertGreaterThan(0, $violations->count());
    }

    public function testCustomPrecisionAndScale(): void
    {
        $constraint = new Decimal(scale: 2, precision: 5);

        $this->assertCount(0, $this->validator->validate('999.99', $constraint));
        $this->assertGreaterThan(0, $this->validator->validate('1000.00', $constraint)->count());
    }

    public function testCustomScaleAllowsMoreDecimals(): void
    {
        $constraint = new Decimal(scale: 4, precision: 10);

        $this->assertCount(0, $this->validator->validate('123456.1234', $constraint));
        $this->assertGreaterThan(0, $this->validator->validate('123456.12345', $constraint)->count());
        $this->assertGreaterThan(0, $this->validator->validate('1234567.12', $constraint)->count());
    }

    public function testConstructorRejectsNonPositiveScale(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Scale must be greater than 0.');

        new Decimal(scale: 0);
    }

    public function testConstructorRejectsPrecisionNotGreaterThanScale(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Precision must be greater than scale.');

        new Decimal(scale: 2, precision: 2);
    }
}
