import { useParams } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useMe } from '@/api/auth'
import { transferQueryKey, useDeleteTransfer, useTransfer } from '@/api/detail'
import type { PersonRef, TransferResponse } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { formatShortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import {
  DeleteSection,
  DetailError,
  DetailLoading,
  DetailScreen,
  EditLink,
  NoteBlock,
} from './DetailParts'
import { deleteWarning } from './expenseSummary'
import { useDeleteAndGoBack } from './useDeleteAndGoBack'

export function TransferDetailPage() {
  const id = Number(useParams().id)
  const transferQuery = useTransfer(id)
  const { data: me } = useMe()
  const transfer = transferQuery.data

  return (
    <DetailScreen
      title="Payment"
      trailing={transfer && <EditLink to={`/transfers/${id}/edit`} label="Edit payment" />}
    >
      {transfer && me ? (
        <TransferDetail transfer={transfer} viewerId={me.id} />
      ) : transferQuery.isError ? (
        <DetailError
          error={transferQuery.error}
          noun="payment"
          onRetry={() => transferQuery.refetch()}
          isRetrying={transferQuery.isFetching}
        />
      ) : (
        <DetailLoading label="Loading payment" />
      )}
    </DetailScreen>
  )
}

function TransferDetail({ transfer, viewerId }: { transfer: TransferResponse; viewerId: number }) {
  const { payer, payee } = transfer
  const nameOf = (person: PersonRef) => (person.id === viewerId ? 'You' : person.displayName)
  const sentence = `${nameOf(payer)} paid ${payee.id === viewerId ? 'you' : payee.displayName}`
  const otherNames = [payer, payee]
    .filter((person) => person.id !== viewerId)
    .map((person) => person.displayName)
  const deletion = useDeleteAndGoBack({
    mutation: useDeleteTransfer(transfer.id),
    detailQueryKey: transferQueryKey(transfer.id),
    successMessage: 'Payment deleted',
    errorMessage: 'Couldn’t delete the payment. Try again.',
  })

  return (
    <>
      <section className="flex flex-col items-center gap-3 px-4 pt-8 pb-5">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Party person={payer} name={nameOf(payer)} />
          <ArrowRight className="size-5.5 text-muted-foreground" aria-hidden="true" />
          <Party person={payee} name={nameOf(payee)} />
        </div>
        <p className="text-[15px] text-foreground/75">{sentence}</p>
      </section>
      <p className="text-center text-[28px] font-semibold tabular-nums">
        {formatMoney(transfer.amount, transfer.currency)}
      </p>
      <p className="mt-1.5 text-center text-[13px] text-muted-foreground">
        {formatShortDate(transfer.occurredOn)}
      </p>

      <div className="mt-3">
        <NoteBlock note={transfer.description} />
      </div>

      <DeleteSection
        actionLabel="Delete payment"
        title="Delete this payment?"
        description={deleteWarning(otherNames)}
        open={deletion.isConfirmOpen}
        onOpenChange={deletion.setConfirmOpen}
        onConfirm={deletion.confirm}
        isPending={deletion.isPending}
      />
    </>
  )
}

function Party({ person, name }: { person: PersonRef; name: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <PersonAvatar id={person.id} name={person.displayName} />
      <span className="max-w-full truncate text-sm font-semibold">{name}</span>
    </div>
  )
}
