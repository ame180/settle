import { useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useMe } from '@/api/auth'
import { useTransfer } from '@/api/transfers'
import type { MeResponse, TransferResponse } from '@/api/types'
import { DiscardSheet } from './DiscardSheet'
import { calendarDayKey } from '@/lib/dates'
import { useGoBack } from '@/lib/useGoBack'
import { useLeaveGuard } from './navigation'
import { PaymentForm, type PaymentDraft } from './PaymentForm'
import { DetailError, DetailLoading } from '@/features/detail/DetailParts'
import { Frame, Header } from './ScreenFrame'

/**
 * /transfers/:id/edit: the payment form, loaded with the payment and saved with PUT. The API
 * only changes amount, date and note, so who paid whom is shown but fixed.
 */
export function EditTransferPage() {
  const { id } = useParams()
  const transferId = Number(id)
  const { data: me } = useMe()
  const transfer = useTransfer(transferId)
  const { goBack } = useGoBack(`/transfers/${transferId}`)

  if (!me || transfer.isPending) {
    return (
      <Frame
        title="Edit payment"
        onClose={goBack}
        body={<DetailLoading label="Loading payment" />}
      />
    )
  }
  if (transfer.isError) {
    return (
      <Frame
        title="Edit payment"
        onClose={goBack}
        body={
          <DetailError
            error={transfer.error}
            noun="payment"
            onRetry={() => transfer.refetch()}
            isRetrying={transfer.isFetching}
          />
        }
      />
    )
  }

  return <EditTransferForm me={me} transfer={transfer.data} goBack={goBack} />
}

function EditTransferForm({
  me,
  transfer,
  goBack,
}: {
  me: MeResponse
  transfer: TransferResponse
  goBack: () => void
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
  const guard = useLeaveGuard(JSON.stringify(draft) !== JSON.stringify(initialDraft))

  return (
    <div className="flex h-full flex-col">
      <Header title="Edit payment" onClose={goBack} />
      <PaymentForm
        me={me}
        draft={draft}
        onDraftChange={setDraft}
        mode={{
          kind: 'edit',
          transferId: transfer.id,
          original: { payer, amount: transfer.amount },
        }}
        onSaved={(message) => {
          toast.success(message)
          guard.allowLeave()
          goBack()
        }}
      />
      <DiscardSheet
        open={guard.blocked}
        title="Discard your changes?"
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
    </div>
  )
}
