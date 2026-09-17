<?php

declare(strict_types=1);

namespace App\Tests\Acceptance;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SpaControllerTest extends WebTestCase
{
    /**
     * @dataProvider spaPathProvider
     */
    public function testSpaIndexIsServedForNonApiPaths(string $path): void
    {
        $client = static::createClient();
        $client->request('GET', $path);

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('Cache-Control', 'no-store, private');
        $this->assertStringContainsString('Settle SPA fixture', (string) $client->getResponse()->getContent());
    }

    /**
     * @return array<string, array{string}>
     */
    public static function spaPathProvider(): array
    {
        return [
            'root' => ['/'],
            'login' => ['/login'],
            'nested' => ['/contacts/42/settle'],
        ];
    }

    public function testApiPathsAreNotServedBySpa(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/unknown');

        $this->assertResponseStatusCodeSame(404);
        $this->assertResponseHeaderSame('Content-Type', 'application/json');
    }
}
