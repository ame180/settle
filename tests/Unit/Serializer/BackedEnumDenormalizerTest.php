<?php

declare(strict_types=1);

namespace App\Tests\Unit\Serializer;

use App\Serializer\BackedEnumDenormalizer;
use App\Tests\Unit\Serializer\Fixture\IntBackedFixture;
use App\Tests\Unit\Serializer\Fixture\StringBackedFixture;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Serializer\Exception\NotNormalizableValueException;
use Symfony\Component\Serializer\Normalizer\BackedEnumNormalizer;

class BackedEnumDenormalizerTest extends TestCase
{
    public function testDenormalizesKnownCases(): void
    {
        $denormalizer = new BackedEnumDenormalizer();

        $this->assertSame(StringBackedFixture::Second, $denormalizer->denormalize('second', StringBackedFixture::class, 'json', ['has_constructor' => true]));
        $this->assertSame(IntBackedFixture::Two, $denormalizer->denormalize(2, IntBackedFixture::class, 'json', ['has_constructor' => true]));
    }

    public function testUnknownCaseOnConstructorArgumentIsNotNormalizableWithAllowedValues(): void
    {
        $exception = $this->denormalizeExpectingFailure('third', StringBackedFixture::class, 'items[0].kind');

        $this->assertSame(['first', 'second'], $exception->getExpectedTypes());
        $this->assertSame('items[0].kind', $exception->getPath());
        $this->assertTrue($exception->canUseMessageForUser());
        $this->assertSame('The value must be one of "first", "second".', $exception->getMessage());
        $previous = $exception->getPrevious();
        $this->assertInstanceOf(NotNormalizableValueException::class, $previous);
        $this->assertInstanceOf(\ValueError::class, $previous->getPrevious());
    }

    public function testUnknownCaseOfIntBackedEnumListsValuesAsStrings(): void
    {
        $exception = $this->denormalizeExpectingFailure(3, IntBackedFixture::class, 'level');

        $this->assertSame(['1', '2'], $exception->getExpectedTypes());
    }

    public function testNonScalarIsNotNormalizable(): void
    {
        $exception = $this->denormalizeExpectingFailure(['first'], StringBackedFixture::class, 'kind');

        $this->assertSame('kind', $exception->getPath());
        $this->assertSame(['first', 'second'], $exception->getExpectedTypes());
        $this->assertSame('The value must be one of "first", "second".', $exception->getMessage());
    }

    public function testAllowInvalidValuesStillReturnsNull(): void
    {
        $result = $this->denormalizeLoosely('third', StringBackedFixture::class, [
            'has_constructor' => true,
            BackedEnumNormalizer::ALLOW_INVALID_VALUES => true,
        ]);

        $this->assertNull($result);
    }

    /**
     * The denormalizer's PHPDoc promises an instance of $type, which hides the null that ALLOW_INVALID_VALUES yields.
     *
     * @param array<string, mixed> $context
     */
    private function denormalizeLoosely(mixed $data, string $type, array $context): mixed
    {
        return (new BackedEnumDenormalizer())->denormalize($data, $type, 'json', $context);
    }

    private function denormalizeExpectingFailure(mixed $data, string $type, string $path): NotNormalizableValueException
    {
        try {
            (new BackedEnumDenormalizer())->denormalize($data, $type, 'json', ['has_constructor' => true, 'deserialization_path' => $path]);
        } catch (NotNormalizableValueException $exception) {
            return $exception;
        }

        $this->fail('Expected NotNormalizableValueException.');
    }
}
