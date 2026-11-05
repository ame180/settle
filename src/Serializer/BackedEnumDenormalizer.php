<?php

declare(strict_types=1);

namespace App\Serializer;

use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;
use Symfony\Component\Serializer\Exception\NotNormalizableValueException;
use Symfony\Component\Serializer\Normalizer\BackedEnumNormalizer;
use Symfony\Component\Serializer\Normalizer\DenormalizerInterface;

/**
 * For constructor arguments, Symfony's BackedEnumNormalizer reports an unknown case with a plain
 * InvalidArgumentException, which #[MapRequestPayload] doesn't collect, so the client gets a 500.
 * Without the has_constructor flag it throws NotNormalizableValueException, which becomes a 400
 * violation. The allowed values are passed as the expected types, so the violation title reads
 * "This value should be of type <value1>|<value2>|..." rather than "int|string" plus the enum class name.
 *
 * The priority only has to beat the built-in serializer.normalizer.backed_enum (-915).
 */
#[AutoconfigureTag('serializer.normalizer', ['priority' => -900])]
final class BackedEnumDenormalizer implements DenormalizerInterface
{
    private readonly BackedEnumNormalizer $inner;

    public function __construct()
    {
        $this->inner = new BackedEnumNormalizer();
    }

    /**
     * @param array<string, mixed> $context
     */
    public function denormalize(mixed $data, string $type, ?string $format = null, array $context = []): mixed
    {
        unset($context['has_constructor']);

        try {
            return $this->inner->denormalize($data, $type, $format, $context);
        } catch (NotNormalizableValueException $exception) {
            /** @var class-string<\BackedEnum> $type */
            $allowedValues = array_map(static fn (\BackedEnum $case): string => (string) $case->value, $type::cases());

            throw NotNormalizableValueException::createForUnexpectedDataType(sprintf('The value must be one of "%s".', implode('", "', $allowedValues)), $data, $allowedValues, $exception->getPath(), true, 0, $exception);
        }
    }

    /**
     * @param array<string, mixed> $context
     */
    public function supportsDenormalization(mixed $data, string $type, ?string $format = null, array $context = []): bool
    {
        return $this->inner->supportsDenormalization($data, $type, $format, $context);
    }

    public function getSupportedTypes(?string $format): array
    {
        return $this->inner->getSupportedTypes($format);
    }
}
