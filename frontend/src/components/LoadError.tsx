import { CircleAlert, RefreshCw } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'

type LoadErrorProps = {
  /** "Couldn't load contacts" */
  title: string
  onRetry: () => void
  isRetrying: boolean
  compact?: boolean
}

/** A query that failed to load, with a Try again button. */
export function LoadError({ title, onRetry, isRetrying, compact }: LoadErrorProps) {
  const { t } = useLingui()
  return (
    <StateMessage
      compact={compact}
      role="alert"
      icon={<CircleAlert className="size-7.5" aria-hidden="true" />}
      iconClassName="bg-destructive/10 text-destructive"
      title={title}
      description={t`Check your connection and try again.`}
    >
      <Button variant="outline" size="pill" onClick={onRetry} disabled={isRetrying}>
        <RefreshCw aria-hidden="true" />
        <Trans>Try again</Trans>
      </Button>
    </StateMessage>
  )
}
