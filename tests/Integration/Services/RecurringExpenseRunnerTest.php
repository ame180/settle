<?php

declare(strict_types=1);

namespace App\Tests\Integration\Services;

use App\Dto\ExpenseDebtRequest;
use App\Dto\ExpenseRequest;
use App\Dto\RepeatRequest;
use App\Entity\Comment;
use App\Entity\Expense;
use App\Entity\RecurringSeries;
use App\Entity\User;
use App\Enum\ExpenseCategory;
use App\Enum\RepeatUnit;
use App\Enum\SplitType;
use App\Services\ExpenseCreateService;
use App\Services\ExpenseUpdateService;
use App\Services\RecurringExpenseRunner;
use App\Tests\Support\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;

class RecurringExpenseRunnerTest extends KernelTestCase
{
    use ClockSensitiveTrait;

    private EntityManagerInterface $entityManager;
    private RecurringExpenseRunner $runner;
    private User $payee;
    private User $friend;

    protected function setUp(): void
    {
        self::bootKernel();

        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->runner = static::getContainer()->get(RecurringExpenseRunner::class);

        $this->payee = UserFactory::createUser();
        $this->friend = UserFactory::createUser();
        $this->entityManager->persist($this->payee);
        $this->entityManager->persist($this->friend);
        $this->entityManager->flush();
    }

    public function testCreatesEveryMissedOccurrenceOnItsOwnDate(): void
    {
        self::mockTime('2026-08-15 12:00');
        $first = $this->createExpense('2026-08-10', new RepeatRequest(RepeatUnit::Month));
        $this->entityManager->persist(new Comment($first, $this->payee, 'Paid by card'));
        $this->entityManager->flush();
        $seriesId = (int) $first->getSeries()?->getId();

        self::mockTime('2026-11-26 03:00');
        $this->assertSame(3, $this->runner->run());

        $this->entityManager->clear();
        $members = $this->membersOf($seriesId);
        $this->assertSame(['2026-08-10', '2026-09-10', '2026-10-10', '2026-11-10'], $this->dates($members));

        foreach (array_slice($members, 1) as $copy) {
            $this->assertSame('Rent', $copy->getTitle());
            $this->assertSame('Flat', $copy->getDescription());
            $this->assertSame('100.00', $copy->getAmount());
            $this->assertSame(SplitType::Shares, $copy->getSplitType());
            $this->assertSame(ExpenseCategory::HomeAndBills, $copy->getCategory());
            $this->assertSame($this->payee->getId(), $copy->getPayee()->getId());
            $this->assertSame(
                [[$this->payee->getId(), '33.33', '1.00'], [$this->friend->getId(), '66.67', '2.00']],
                $this->debtsOf($copy),
            );
            $this->assertSame(0, $this->entityManager->getRepository(Comment::class)->count(['expense' => $copy]));
        }

        $series = $this->entityManager->find(RecurringSeries::class, $seriesId);
        $this->assertSame('2026-12-10', $series?->getNextRunOn()->format('Y-m-d'));
    }

    public function testRunningAgainCreatesNothing(): void
    {
        self::mockTime('2026-10-15');
        $first = $this->createExpense('2026-10-10', new RepeatRequest(RepeatUnit::Week));
        $seriesId = (int) $first->getSeries()?->getId();

        self::mockTime('2026-10-24');
        $this->assertSame(2, $this->runner->run());
        $this->assertSame(0, $this->runner->run());

        $this->entityManager->clear();
        $this->assertSame(['2026-10-10', '2026-10-17', '2026-10-24'], $this->dates($this->membersOf($seriesId)));
    }

    public function testNothingIsDueBeforeTheNextDate(): void
    {
        self::mockTime('2026-11-26');
        $this->createExpense('2026-10-26', new RepeatRequest(RepeatUnit::Month));

        $this->assertSame(0, $this->runner->run());
    }

    public function testCopiesTheLatestAndKeepsTheAnchorDay(): void
    {
        self::mockTime('2027-01-31');
        $first = $this->createExpense('2027-01-31', new RepeatRequest(RepeatUnit::Month));
        $seriesId = (int) $first->getSeries()?->getId();

        self::mockTime('2027-02-28');
        $this->assertSame(1, $this->runner->run());

        $this->entityManager->clear();
        $february = $this->membersOf($seriesId)[1];
        $this->updateExpense($february, '2027-02-28', '120.00', new RepeatRequest(RepeatUnit::Month));

        self::mockTime('2027-03-31');
        $this->assertSame(1, $this->runner->run());

        $this->entityManager->clear();
        $members = $this->membersOf($seriesId);
        $this->assertSame(['2027-01-31', '2027-02-28', '2027-03-31'], $this->dates($members));
        $this->assertSame('120.00', $members[2]->getAmount());
    }

    public function testSkipsAStoppedSeries(): void
    {
        self::mockTime('2026-11-01');
        $first = $this->createExpense('2026-11-01', new RepeatRequest(RepeatUnit::Week));
        $seriesId = (int) $first->getSeries()?->getId();
        $this->updateExpense($first, '2026-11-01', '100.00', null);

        self::mockTime('2026-12-01');
        $this->assertSame(0, $this->runner->run());

        $this->entityManager->clear();
        $this->assertCount(1, $this->membersOf($seriesId));
    }

    private function createExpense(string $occurredOn, ?RepeatRequest $repeat): Expense
    {
        return static::getContainer()->get(ExpenseCreateService::class)->create($this->payee, $this->request($occurredOn, '100.00', $repeat));
    }

    private function updateExpense(Expense $expense, string $occurredOn, string $amount, ?RepeatRequest $repeat): void
    {
        $expense = $this->entityManager->find(Expense::class, $expense->getId());
        $payee = $this->entityManager->find(User::class, $this->payee->getId());
        static::getContainer()->get(ExpenseUpdateService::class)->update($payee, $expense, $this->request($occurredOn, $amount, $repeat));
    }

    private function request(string $occurredOn, string $amount, ?RepeatRequest $repeat): ExpenseRequest
    {
        return new ExpenseRequest(
            title: 'Rent',
            amount: $amount,
            payeeId: (int) $this->payee->getId(),
            debts: [
                new ExpenseDebtRequest((int) $this->payee->getId(), '1'),
                new ExpenseDebtRequest((int) $this->friend->getId(), '2'),
            ],
            occurredOn: new \DateTimeImmutable($occurredOn),
            splitType: SplitType::Shares,
            category: ExpenseCategory::HomeAndBills,
            description: 'Flat',
            repeat: $repeat,
        );
    }

    /**
     * @return list<Expense>
     */
    private function membersOf(int $seriesId): array
    {
        return $this->entityManager->getRepository(Expense::class)->findBy(['series' => $seriesId], ['id' => 'ASC']);
    }

    /**
     * @param list<Expense> $expenses
     *
     * @return list<string>
     */
    private function dates(array $expenses): array
    {
        return array_map(static fn (Expense $expense): string => $expense->getOccurredOn()->format('Y-m-d'), $expenses);
    }

    /**
     * @return list<array{?int, string, ?string}>
     */
    private function debtsOf(Expense $expense): array
    {
        $debts = [];
        foreach ($expense->getDebts() as $debt) {
            $debts[] = [$debt->getPayer()->getId(), $debt->getAmount(), $debt->getSplitValue()];
        }
        usort($debts, static fn (array $a, array $b): int => $a[0] <=> $b[0]);

        return $debts;
    }
}
