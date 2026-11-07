import { Link } from 'react-router'
import { Lock, SearchX } from 'lucide-react'
import { ApiError } from '@/api/client'
import { LoadError } from '@/components/LoadError'
import { Spinner } from '@/components/Spinner'
import { StateMessage } from '@/components/StateMessage'
import { buttonClassName } from '@/components/ui/button-variants'

// Load states for one expense or payment, shared by its detail and edit screens.

export function ItemLoading({ label }: { label: string }) {
  return <Spinner label={label} className="pt-40" />
}

type ItemErrorProps = {
  error: Error
  /** "expense" or "payment" */
  noun: string
  onRetry: () => void
  isRetrying: boolean
}

export function ItemError({ error, noun, onRetry, isRetrying }: ItemErrorProps) {
  const status = error instanceof ApiError ? error.status : undefined

  if (status === 404) {
    return <ItemNotFound noun={noun} />
  }

  if (status === 403) {
    return (
      <StateMessage
        icon={<Lock className="size-7.5" aria-hidden="true" />}
        title={`You can’t see this ${noun}`}
        description="Only the people in it can open it."
      >
        <BackToActivity />
      </StateMessage>
    )
  }

  return (
    <LoadError title={`Couldn’t load this ${noun}`} onRetry={onRetry} isRetrying={isRetrying} />
  )
}

/** Also shown, without asking the API, when the URL's id isn't an id at all. */
export function ItemNotFound({ noun }: { noun: string }) {
  return (
    <StateMessage
      icon={<SearchX className="size-7.5" aria-hidden="true" />}
      title={`This ${noun} doesn’t exist`}
      description="It may have been deleted."
    >
      <BackToActivity />
    </StateMessage>
  )
}

function BackToActivity() {
  return (
    <Link to="/activity" className={buttonClassName({ variant: 'outline', size: 'pill' })}>
      Go to activity
    </Link>
  )
}
