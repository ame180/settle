import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '@/api/auth'

export function RequireAuth() {
  const { data: me, isPending } = useMe()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>
    )
  }

  if (!me) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
