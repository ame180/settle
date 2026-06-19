<?php

declare(strict_types=1);

namespace App\Services;

use App\Dto\TransferRequest;
use App\Dto\TransferUpdateRequest;
use App\Entity\Transfer;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class TransferService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function create(User $creator, TransferRequest $request): Transfer
    {
        if ($request->payerId === $request->payeeId) {
            throw new BadRequestHttpException('Transfer payer and payee must be different.');
        }

        $usersById = $this->userRepository->findIndexedById([$request->payerId, $request->payeeId]);

        $payer = $usersById[$request->payerId] ?? null;
        $payee = $usersById[$request->payeeId] ?? null;
        if (null === $payer || null === $payee) {
            throw new UnprocessableEntityHttpException('Payer or payee user does not exist.');
        }

        $creatorId = $creator->getId();
        if (null === $creatorId || !in_array($creatorId, [$request->payerId, $request->payeeId], true)) {
            throw new UnprocessableEntityHttpException('Creator must be the payer or the payee.');
        }

        $transfer = new Transfer($payer, $payee, $request->amount, $request->occurredOn, $request->description);

        $this->entityManager->persist($transfer);
        $this->entityManager->flush();

        return $transfer;
    }

    public function update(User $editor, Transfer $transfer, TransferUpdateRequest $request): Transfer
    {
        if (!$this->isUserInvolved($editor, $transfer)) {
            throw new AccessDeniedHttpException('Editor must be involved in the transfer.');
        }

        $transfer
            ->setAmount($request->amount)
            ->setOccurredOn($request->occurredOn)
            ->setDescription($request->description);

        $this->entityManager->flush();

        return $transfer;
    }

    public function delete(User $editor, Transfer $transfer): void
    {
        if (!$this->isUserInvolved($editor, $transfer)) {
            throw new AccessDeniedHttpException('Editor must be involved in the transfer.');
        }

        $this->entityManager->remove($transfer);
        $this->entityManager->flush();
    }

    private function isUserInvolved(User $user, Transfer $transfer): bool
    {
        $userId = $user->getId();

        return $transfer->getPayer()->getId() === $userId
            || $transfer->getPayee()->getId() === $userId;
    }
}
