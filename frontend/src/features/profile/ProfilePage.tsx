import { Link, useNavigate } from 'react-router'
import { ChevronRight, LogOut } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useLogout, useMe } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'
import { cn } from '@/lib/utils'
import { ownDisplayName } from '@/lib/person'

const rowClassName =
  'flex min-h-15 items-center gap-3 border-b border-border/60 px-4 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset'

export function ProfilePage() {
  const { t } = useLingui()
  const { data: me } = useMe()
  const logoutMutation = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
  }

  return (
    <>
      <PageHeader title={t`Profile`} />
      {me && (
        <>
          <section
            aria-label={t`You`}
            className="flex flex-col items-center gap-3 px-4 pt-7 pb-6 text-center"
          >
            <PersonAvatar id={me.id} name={ownDisplayName(me)} className="size-18 text-2xl" />
            <div className="flex max-w-full flex-col gap-1">
              <h2 className="truncate text-xl font-semibold">{ownDisplayName(me)}</h2>
              {me.name && <p className="truncate text-[13px] text-muted-foreground">{me.email}</p>}
            </div>
          </section>

          <div className="border-t border-border/60">
            <Link to="/profile/name" className={cn(rowClassName, 'hover:bg-secondary')}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-muted-foreground">
                  <Trans>Name</Trans>
                </span>
                <span className={cn('truncate', !me.name && 'font-semibold text-primary')}>
                  {me.name ?? t`Add your name`}
                </span>
                {!me.name && (
                  <span className="text-[13px] leading-[1.4] text-muted-foreground">
                    <Trans>Contacts see your email until you add one.</Trans>
                  </span>
                )}
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
            <div className={rowClassName}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-muted-foreground">
                  <Trans>Email</Trans>
                </span>
                <span className="truncate text-foreground/80">{me.email}</span>
              </span>
            </div>
          </div>
        </>
      )}
      <div className="px-4 pt-7 pb-4">
        <Button
          variant="outline"
          size="pill"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut aria-hidden="true" />
          <Trans>Log out</Trans>
        </Button>
      </div>
    </>
  )
}
