import { Link } from 'react-router'
import { Lock, SearchX } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ApiError } from '@/api/client'
import { LoadError } from '@/components/LoadError'
import { Spinner } from '@/components/Spinner'
import { StateMessage } from '@/components/StateMessage'
import { buttonClassName } from '@/components/ui/button-variants'

// Load states for one expense or payment, shared by its detail and edit screens.

export function ItemLoading({ label }: { label: string }) {
  return <Spinner label={label} className="pt-40" />
}

export type ItemKind = 'expense' | 'payment'

type ItemErrorProps = {
  error: Error
  kind: ItemKind
  onRetry: () => void
  isRetrying: boolean
}

export function ItemError({ error, kind, onRetry, isRetrying }: ItemErrorProps) {
  const { t } = useLingui()
  const isPayment = kind === 'payment'
  const status = error instanceof ApiError ? error.status : undefined

  if (status === 404) {
    return <ItemNotFound kind={kind} />
  }

  if (status === 403) {
    return (
      <StateMessage
        icon={<Lock className="size-7.5" aria-hidden="true" />}
        title={isPayment ? t`You can’t see this payment` : t`You can’t see this expense`}
        description={t`Only the people in it can open it.`}
      >
        <BackToActivity />
      </StateMessage>
    )
  }

  return (
    <LoadError
      title={isPayment ? t`Couldn’t load this payment` : t`Couldn’t load this expense`}
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  )
}

/** Also shown, without asking the API, when the URL's id isn't an id at all. */
export function ItemNotFound({ kind }: { kind: ItemKind }) {
  const { t } = useLingui()
  const isPayment = kind === 'payment'

  return (
    <StateMessage
      icon={<SearchX className="size-7.5" aria-hidden="true" />}
      title={isPayment ? t`This payment doesn’t exist` : t`This expense doesn’t exist`}
      description={
        isPayment
          ? t({ message: 'It may have been deleted.', context: 'payment' })
          : t({ message: 'It may have been deleted.', context: 'expense' })
      }
    >
      <BackToActivity />
    </StateMessage>
  )
}

function BackToActivity() {
  return (
    <Link to="/activity" className={buttonClassName({ variant: 'outline', size: 'pill' })}>
      <Trans>Go to activity</Trans>
    </Link>
  )
}
