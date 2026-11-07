import { useParams } from 'react-router'
import { parseIdParam } from '@/lib/parseIdParam'
import { ArrowRight } from 'lucide-react'
import { useMe } from '@/api/auth'
import { useDeleteTransfer, useTransfer } from '@/api/transfers'
import type { PersonRef, TransferResponse } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { formatShortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import {
  DetailActions,
  DetailError,
  DetailLoading,
  DetailNotFound,
  DetailScreen,
  NoteBlock,
} from './DetailParts'
import { deleteWarning } from './expenseSummary'
import { useDeleteAndGoBack } from './useDeleteAndGoBack'
import { nameForViewer, peopleOtherThan } from '@/lib/person'

export function TransferDetailPage() {
  const id = parseIdParam(useParams().id)

  return id === null ? (
    <DetailScreen title="Payment">
      <DetailNotFound noun="payment" />
    </DetailScreen>
  ) : (
    <TransferDetailScreen id={id} />
  )
}

function TransferDetailScreen({ id }: { id: number }) {
  const transferQuery = useTransfer(id)
  const { data: me } = useMe()
  const transfer = transferQuery.data
  const deletion = useDeleteAndGoBack({
    mutation: useDeleteTransfer(id),
    successMessage: 'Payment deleted',
    errorMessage: 'Couldn’t delete the payment. Try again.',
  })

  return (
    <DetailScreen
      title="Payment"
      trailing={
        transfer &&
        me && (
          <DetailActions
            editTo={`/transfers/${id}/edit`}
            editLabel="Edit payment"
            deleteLabel="Delete payment"
            confirmTitle="Delete this payment?"
            confirmDescription={deleteWarning(
              peopleOtherThan(me.id, [transfer.payer, transfer.payee]).map(
                (person) => person.displayName,
              ),
            )}
            deletion={deletion}
          />
        )
      }
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
  const sentence = `${nameForViewer(payer, viewerId)} paid ${payee.id === viewerId ? 'you' : payee.displayName}`

  return (
    <>
      <section className="flex flex-col items-center gap-3 px-4 pt-8 pb-5">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Party person={payer} name={nameForViewer(payer, viewerId)} />
          <ArrowRight className="size-5.5 text-muted-foreground" aria-hidden="true" />
          <Party person={payee} name={nameForViewer(payee, viewerId)} />
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
