import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import { CircleAlert, RefreshCw, SearchX } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { BackLink } from '@/components/BackLink'
import { PageHeader } from '@/components/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import { buttonClassName } from '@/components/ui/button-variants'

function NotFoundMessage() {
  const { t } = useLingui()
  return (
    <StateMessage
      icon={<SearchX className="size-7.5" aria-hidden="true" />}
      title={t`This page doesn’t exist`}
      description={t`Check the address or go back to your contacts.`}
    >
      <Link to="/" className={buttonClassName({ variant: 'outline', size: 'pill' })}>
        <Trans>Go to contacts</Trans>
      </Link>
    </StateMessage>
  )
}

export function NotFoundPage() {
  const { t } = useLingui()
  return (
    <>
      <PageHeader title={t`Not found`} leading={<BackLink to="/" label={t`Back`} />} />
      <NotFoundMessage />
    </>
  )
}

export function RouteErrorPage() {
  const { t } = useLingui()
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <main className="h-full overflow-y-auto">
        <NotFoundMessage />
      </main>
    )
  }

  return (
    <main className="h-full overflow-y-auto">
      <StateMessage
        role="alert"
        icon={<CircleAlert className="size-7.5" aria-hidden="true" />}
        iconClassName="bg-destructive/10 text-destructive"
        title={t`Something went wrong`}
        description={t`Reload the page to try again.`}
      >
        <Button variant="outline" size="pill" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" />
          <Trans>Reload</Trans>
        </Button>
      </StateMessage>
    </main>
  )
}
