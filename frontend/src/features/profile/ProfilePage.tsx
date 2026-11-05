import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ChevronRight, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useLogout, useMe } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'
import { cn } from '@/lib/utils'

export type ProfileLocationState = { nameSaved?: boolean } | null

const rowClassName =
  'flex min-h-15 items-center gap-3 border-b border-border/60 px-4 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset'

export function ProfilePage() {
  const { data: me } = useMe()
  const logoutMutation = useLogout()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    if (location.state === null) {
      return
    }
    if ((location.state as ProfileLocationState)?.nameSaved) {
      // Keyed by navigation so StrictMode's double effect run doesn't stack two toasts.
      toast.success('Name saved', { id: `name-saved-${location.key}` })
    }
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.key, location.pathname, navigate])

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
  }

  return (
    <>
      <PageHeader title="Profile" />
      {me && (
        <>
          <section
            aria-label="You"
            className="flex flex-col items-center gap-3 px-4 pt-7 pb-6 text-center"
          >
            <PersonAvatar id={me.id} name={me.name ?? me.email} className="size-18 text-2xl" />
            <div className="flex max-w-full flex-col gap-1">
              <h2 className="truncate text-xl font-semibold">{me.name ?? me.email}</h2>
              {me.name && <p className="truncate text-[13px] text-muted-foreground">{me.email}</p>}
            </div>
          </section>

          {!me.name && (
            <div className="mx-4 mb-4 flex flex-col gap-1 rounded-xl border bg-muted/50 px-4 py-3.5">
              <p className="text-[15px] font-semibold">Add your name</p>
              <p className="text-[13px] leading-[1.45] text-muted-foreground">
                Your contacts see your email until you set a name.
              </p>
            </div>
          )}

          <div className="border-t border-border/60">
            <Link to="/profile/name" className={cn(rowClassName, 'hover:bg-secondary')}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className={cn('truncate', !me.name && 'font-semibold text-primary')}>
                  {me.name ?? 'Add your name'}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
            <div className={rowClassName}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="truncate text-foreground/80">{me.email}</span>
              </span>
            </div>
          </div>
        </>
      )}
      <div className="px-4 pt-7 pb-4">
        <Button
          variant="outline"
          className="rounded-full px-5 text-[15px]"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut aria-hidden="true" />
          Log out
        </Button>
      </div>
    </>
  )
}
