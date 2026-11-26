<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\RecurringSeries;
use App\Entity\User;
use App\Services\RecurringExpenseRunner;
use App\Tests\Support\ApiTestCase;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;

class RecurringExpenseApiTest extends ApiTestCase
{
    use ClockSensitiveTrait;

    private KernelBrowser $client;
    private User $user;
    private User $friend;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);

        $this->user = UserFactory::createUser();
        $this->friend = UserFactory::createUser();
        $entityManager->persist($this->user);
        $entityManager->persist($this->friend);
        $entityManager->flush();

        $this->client->loginUser($this->user);
        self::mockTime('2026-11-26 10:00');
    }

    public function testCreateWithRepeatStartsAfterToday(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));

        $this->assertJsonResponseIsSuccessful(201);
        $response = $this->getJsonResponse();
        $this->assertJsonStructure(['repeat' => ['unit', 'every', 'nextOn', 'active'], 'series' => ['latestId', 'isLatest']], $response);
        $this->assertSame('month', $response['repeat']['unit']);
        $this->assertSame(1, $response['repeat']['every']);
        $this->assertStringStartsWith('2026-12-10', $response['repeat']['nextOn']);
        $this->assertTrue($response['repeat']['active']);
        $this->assertSame(['latestId' => $response['id'], 'isLatest' => true], $response['series']);
    }

    public function testCreateWithoutRepeat(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', null));

        $this->assertJsonResponseIsSuccessful(201);
        $response = $this->getJsonResponse();
        $this->assertNull($response['repeat']);
        $this->assertNull($response['series']);
    }

    public function testRejectsUnsupportedFrequency(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', ['unit' => 'month', 'every' => 2]));

        $this->assertResponseStatusCodeSame(400);
        $this->assertSame('repeat.every', $this->getJsonResponse()['violations'][0]['propertyPath']);
    }

    public function testOlderMemberCannotSetRepeatButCanBeEdited(): void
    {
        [$olderId, $latestId] = $this->createSeriesWithTwoMembers();

        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$olderId, $this->payload('2026-11-26', ['unit' => 'week', 'every' => 1]));
        $this->assertResponseStatusCodeSame(422);

        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$olderId, $this->payload('2026-11-25', null, '90.00'));
        $this->assertJsonResponseIsSuccessful(200);
        $response = $this->getJsonResponse();
        $this->assertSame('90.00', $response['amount']);
        $this->assertSame(['latestId' => $latestId, 'isLatest' => false], $response['series']);
        $this->assertTrue($response['repeat']['active']);
    }

    public function testTurningTheLatestOffAndOnAgain(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));
        $id = $this->getJsonResponse()['id'];

        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2026-11-10', null));
        $this->assertJsonResponseIsSuccessful(200);
        $response = $this->getJsonResponse();
        $this->assertFalse($response['repeat']['active']);
        $this->assertNull($response['repeat']['nextOn']);

        self::mockTime('2027-01-20');
        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));
        $this->assertJsonResponseIsSuccessful(200);
        $response = $this->getJsonResponse();
        $this->assertTrue($response['repeat']['active']);
        $this->assertStringStartsWith('2027-02-10', $response['repeat']['nextOn']);
    }

    public function testChangingTheLatestsFrequencyResetsTheSchedule(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-20', ['unit' => 'month', 'every' => 1]));
        $id = $this->getJsonResponse()['id'];

        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2026-11-20', ['unit' => 'week', 'every' => 1]));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertStringStartsWith('2026-11-27', $this->getJsonResponse()['repeat']['nextOn']);
    }

    public function testMovingTheLatestsDateMovesTheSchedule(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));
        $id = $this->getJsonResponse()['id'];

        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2026-11-15', ['unit' => 'month', 'every' => 1]));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertStringStartsWith('2026-12-15', $this->getJsonResponse()['repeat']['nextOn']);
    }

    public function testMovingTheLatestOntoALaterScheduleDateCreatesNoDuplicate(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));
        $id = $this->getJsonResponse()['id'];

        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2027-01-10', ['unit' => 'month', 'every' => 1]));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertStringStartsWith('2027-02-10', $this->getJsonResponse()['repeat']['nextOn']);
    }

    public function testMovingTheLatestBackOntoAnEarlierScheduleDateSkipsNothing(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-12-10', ['unit' => 'month', 'every' => 1]));
        $id = $this->getJsonResponse()['id'];

        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertStringStartsWith('2026-12-10', $this->getJsonResponse()['repeat']['nextOn']);
    }

    public function testADateMovedWhileStoppedCountsOnRestart(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));
        $id = $this->getJsonResponse()['id'];
        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2026-11-10', null));
        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2026-11-15', null));

        $this->requestJson($this->client, 'PUT', '/api/expenses/'.$id, $this->payload('2026-11-15', ['unit' => 'month', 'every' => 1]));

        $this->assertJsonResponseIsSuccessful(200);
        $this->assertStringStartsWith('2026-12-15', $this->getJsonResponse()['repeat']['nextOn']);
    }

    public function testDeletingAnOlderMemberKeepsTheSeries(): void
    {
        [$olderId, $latestId] = $this->createSeriesWithTwoMembers();

        $this->client->request('DELETE', '/api/expenses/'.$olderId);
        $this->assertResponseStatusCodeSame(204);

        $this->client->request('GET', '/api/expenses/'.$latestId);
        $response = $this->getJsonResponse();
        $this->assertSame(['latestId' => $latestId, 'isLatest' => true], $response['series']);
        $this->assertTrue($response['repeat']['active']);
    }

    public function testDeletingTheLatestStopsTheSeries(): void
    {
        [$olderId, $latestId] = $this->createSeriesWithTwoMembers();

        $this->client->request('DELETE', '/api/expenses/'.$latestId);
        $this->assertResponseStatusCodeSame(204);

        $this->client->request('GET', '/api/expenses/'.$olderId);
        $response = $this->getJsonResponse();
        $this->assertSame(['latestId' => $olderId, 'isLatest' => true], $response['series']);
        $this->assertFalse($response['repeat']['active']);
    }

    public function testDeletingTheOnlyMemberRemovesTheSeries(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));
        $id = $this->getJsonResponse()['id'];

        $this->client->request('DELETE', '/api/expenses/'.$id);
        $this->assertResponseStatusCodeSame(204);

        $this->assertSame(0, static::getContainer()->get(EntityManagerInterface::class)->getRepository(RecurringSeries::class)->count([]));
    }

    public function testActivityMarksRecurringExpenses(): void
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-10', ['unit' => 'month', 'every' => 1]));
        $recurringId = $this->getJsonResponse()['id'];
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-11', null));
        $plainId = $this->getJsonResponse()['id'];

        $this->client->request('GET', '/api/activity');

        $this->assertJsonResponseIsSuccessful(200);
        $recurringById = array_column($this->getJsonResponse(), 'recurring', 'id');
        $this->assertSame([$plainId => false, $recurringId => true], $recurringById);
    }

    /**
     * @return array{int, int} the older and the latest expense id
     */
    private function createSeriesWithTwoMembers(): array
    {
        $this->requestJson($this->client, 'POST', '/api/expenses', $this->payload('2026-11-19', ['unit' => 'week', 'every' => 1]));
        $olderId = $this->getJsonResponse()['id'];

        self::mockTime('2026-12-03 10:00');
        $this->assertSame(1, static::getContainer()->get(RecurringExpenseRunner::class)->run());

        $this->client->request('GET', '/api/expenses/'.$olderId);

        return [$olderId, $this->getJsonResponse()['series']['latestId']];
    }

    /**
     * @param array{unit: string, every: int}|null $repeat
     *
     * @return array<string, mixed>
     */
    private function payload(string $occurredOn, ?array $repeat, string $amount = '100.00'): array
    {
        return [
            'title' => 'Rent',
            'amount' => $amount,
            'payeeId' => $this->user->getId(),
            'occurredOn' => $occurredOn,
            'splitType' => 'equal',
            'debts' => [
                ['payerId' => $this->user->getId()],
                ['payerId' => $this->friend->getId()],
            ],
            'repeat' => $repeat,
        ];
    }
}
