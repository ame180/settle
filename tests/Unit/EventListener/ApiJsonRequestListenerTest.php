<?php

declare(strict_types=1);

namespace App\Tests\Unit\EventListener;

use App\EventListener\ApiJsonRequestListener;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

class ApiJsonRequestListenerTest extends TestCase
{
    /**
     * @dataProvider apiPathProvider
     */
    public function testApiPathsForceJsonFormat(string $path): void
    {
        $request = Request::create($path, 'GET');

        (new ApiJsonRequestListener())($this->createEvent($request));

        $this->assertSame('json', $request->getRequestFormat());
    }

    /**
     * @return array<string, array{string}>
     */
    public static function apiPathProvider(): array
    {
        return [
            'exact /api' => ['/api'],
            'trailing slash' => ['/api/'],
            'nested endpoint' => ['/api/me'],
        ];
    }

    /**
     * @dataProvider nonApiPathProvider
     */
    public function testNonApiPathsAreIgnored(string $path): void
    {
        $request = Request::create(
            $path,
            'POST',
            ['title' => 'form encoded'],
            [],
            [],
            ['CONTENT_TYPE' => 'application/x-www-form-urlencoded'],
        );

        (new ApiJsonRequestListener())($this->createEvent($request));

        $this->assertSame('html', $request->getRequestFormat());
    }

    /**
     * @return array<string, array{string}>
     */
    public static function nonApiPathProvider(): array
    {
        return [
            'api prefix without slash' => ['/apifoo'],
            'api hyphenated' => ['/api-docs'],
            'regular route' => ['/login'],
        ];
    }

    private function createEvent(Request $request): RequestEvent
    {
        return new RequestEvent(
            $this->createStub(HttpKernelInterface::class),
            $request,
            HttpKernelInterface::MAIN_REQUEST,
        );
    }
}
