import { Trans, useLingui } from '@lingui/react/macro'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '@/api/auth'
import { LoadError } from '@/components/LoadError'

export function RequireAuth() {
  const { t } = useLingui()
  const meQuery = useMe()
  const location = useLocation()

  if (meQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Trans>Loading…</Trans>
      </div>
    )
  }

  if (!meQuery.data && meQuery.isError) {
    return (
      <main className="h-full overflow-y-auto">
        <LoadError
          title={t`Couldn’t reach Settle`}
          onRetry={() => meQuery.refetch()}
          isRetrying={meQuery.isFetching}
        />
      </main>
    )
  }

  if (!meQuery.data) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}
