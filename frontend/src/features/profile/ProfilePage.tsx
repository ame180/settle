import { useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { useLogout, useMe } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'

export function ProfilePage() {
  const { data: me } = useMe()
  const logoutMutation = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
  }

  return (
    <>
      <PageHeader title="Profile" />
      <div className="space-y-6 p-4">
        {me && (
          <div className="flex items-center gap-3.5">
            <PersonAvatar id={me.id} name={me.name ?? me.email} />
            <div className="min-w-0">
              {me.name && <div className="truncate">{me.name}</div>}
              <div className="truncate text-sm text-muted-foreground">{me.email}</div>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          className="rounded-full px-5"
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
