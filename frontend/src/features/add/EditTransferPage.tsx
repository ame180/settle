import { useState } from 'react'
import { useParams } from 'react-router'
import { parseIdParam } from '@/lib/parseIdParam'
import { useMe } from '@/api/auth'
import { useTransfer } from '@/api/transfers'
import type { MeResponse, TransferResponse } from '@/api/types'
import { DiscardSheet } from './DiscardSheet'
import { calendarDayKey } from '@/lib/dates'
import { useGoBack } from '@/lib/useGoBack'
import { useLeaveGuard } from './navigation'
import { PaymentForm, type PaymentDraft } from './PaymentForm'
import { ItemError, ItemLoading } from '@/components/ItemStates'
import { Frame, Header, NotFoundFrame } from './ScreenFrame'

/**
 * /transfers/:id/edit: the payment form, loaded with the payment and saved with PUT. The API
 * only changes amount, date and note, so who paid whom is shown but fixed.
 */
export function EditTransferPage() {
  const transferId = parseIdParam(useParams().id)

  return transferId === null ? (
    <NotFoundFrame title="Edit payment" noun="payment" />
  ) : (
    <EditTransferLoader transferId={transferId} />
  )
}

function EditTransferLoader({ transferId }: { transferId: number }) {
  const { data: me } = useMe()
  const transfer = useTransfer(transferId)
  const fallback = `/transfers/${transferId}`
  const { goBack } = useGoBack(fallback)

  if (!me || transfer.isPending) {
    return (
      <Frame title="Edit payment" onClose={goBack} body={<ItemLoading label="Loading payment" />} />
    )
  }
  if (transfer.isError) {
    return (
      <Frame
        title="Edit payment"
        onClose={goBack}
        body={
          <ItemError
            error={transfer.error}
            noun="payment"
            onRetry={() => transfer.refetch()}
            isRetrying={transfer.isFetching}
          />
        }
      />
    )
  }

  return <EditTransferForm me={me} transfer={transfer.data} fallback={fallback} />
}

function EditTransferForm({
  me,
  transfer,
  fallback,
}: {
  me: MeResponse
  transfer: TransferResponse
  fallback: string
}) {
  const payer = transfer.payer.id === me.id ? 'me' : 'them'
  const [initialDraft] = useState<PaymentDraft>(() => ({
    person: payer === 'me' ? transfer.payee : transfer.payer,
    payer,
    amount: transfer.amount,
    occurredOn: calendarDayKey(transfer.occurredOn),
    note: transfer.description ?? '',
  }))
  const [draft, setDraft] = useState(initialDraft)
  const guard = useLeaveGuard(JSON.stringify(draft) !== JSON.stringify(initialDraft), fallback)

  return (
    <div className="flex h-full flex-col">
      <Header title="Edit payment" onClose={guard.goBack} />
      <PaymentForm
        me={me}
        draft={draft}
        onDraftChange={setDraft}
        mode={{
          kind: 'edit',
          transferId: transfer.id,
          original: { payer, amount: transfer.amount },
        }}
        onSaved={guard.leaveAfterSave}
      />
      <DiscardSheet guard={guard} title="Discard your changes?" />
    </div>
  )
}
