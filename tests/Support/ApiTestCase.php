<?php

declare(strict_types=1);

namespace App\Tests\Support;

use PHPUnit\Framework\Constraint\LogicalAnd;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Test\Constraint\ResponseHasHeader;
use Symfony\Component\HttpFoundation\Test\Constraint\ResponseIsSuccessful;
use Symfony\Component\HttpFoundation\Test\Constraint\ResponseStatusCodeSame;

abstract class ApiTestCase extends WebTestCase
{
    /**
     * @return array<mixed>
     */
    protected function getJsonResponse(): array
    {
        $client = static::getClient();
        $content = $client->getResponse()->getContent();

        if (false === $content) {
            static::fail('Response content is empty.');
        }

        $decoded = json_decode($content, true);

        if (JSON_ERROR_NONE !== json_last_error()) {
            static::fail('Invalid JSON response: '.json_last_error_msg());
        }

        return $decoded;
    }

    protected function assertJsonResponseIsSuccessful(?int $statusCode = null): void
    {
        $constraint = new ResponseIsSuccessful();

        if (null !== $statusCode) {
            $constraint = LogicalAnd::fromConstraints(
                $constraint,
                new ResponseStatusCodeSame($statusCode)
            );
        }

        $constraint = LogicalAnd::fromConstraints(
            $constraint,
            new ResponseHasHeader('Content-Type')
        );

        self::assertThatForResponse($constraint);

        // Verify Content-Type contains application/json (allows charset suffix)
        $response = self::getClient()->getResponse();
        $contentType = $response->headers->get('Content-Type');
        $this->assertStringContainsString(
            'application/json',
            $contentType,
            sprintf('Expected Content-Type to contain application/json, got %s', $contentType)
        );
    }

    /**
     * Assert that the JSON response contains the expected structure.
     *
     * For leaf level, provide a simple array of expected keys: ['id', 'title', 'description']
     * For array items, use numeric key: [0 => ['id', 'title']]
     * For nested objects, use associative arrays: ['user' => ['name', 'email']]
     *
     * @param array<int|string, mixed> $structure Expected structure
     * @param array<mixed>|null        $data
     */
    protected function assertJsonStructure(array $structure, ?array $data = null): void
    {
        if (empty($structure)) {
            throw new \InvalidArgumentException('Structure array cannot be empty');
        }

        if (null === $data) {
            $data = $this->getJsonResponse();
        }

        foreach ($structure as $key => $value) {
            // Nested object structure check (e.g., 'user' => ['name', 'email'])
            if (is_string($key)) {
                $this->assertArrayHasKey(
                    $key,
                    $data,
                    sprintf('Expected key "%s" not found in JSON response', $key)
                );

                $this->assertJsonStructure($value, $data[$key]);

                continue;
            }

            // Leaf level structure check (e.g., ['id', 'title', 'description'])
            if (is_string($value)) {
                $this->assertArrayHasKey(
                    $value,
                    $data,
                    sprintf('Expected key "%s" not found in JSON response', $value)
                );

                continue;
            }

            // Array item structure check (e.g., [0 => ['id', 'title']])
            $this->assertNotEmpty($data, 'Expected non-empty array');
            $this->assertIsArray($data[0] ?? null, 'Expected first element to be an array');
            $this->assertJsonStructure($value, $data[0]);
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    protected function requestJson(KernelBrowser $client, string $method, string $url, array $payload): void
    {
        $client->request(
            $method,
            $url,
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
            ],
            json_encode($payload, JSON_THROW_ON_ERROR)
        );
    }
}
