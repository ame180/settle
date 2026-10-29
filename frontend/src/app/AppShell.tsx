import { NavLink, Outlet } from 'react-router'
import { Activity, Users } from 'lucide-react'
import { useMe } from '@/api/auth'
import { PersonAvatar } from '@/components/PersonAvatar'
import { cn } from '@/lib/utils'

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground',
    isActive && 'font-semibold text-foreground',
  )

export function AppShell() {
  const { data: me } = useMe()

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav aria-label="Main" className="border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-3">
          <li>
            <NavLink to="/" end className={navLinkClassName}>
              <Users className="size-6" aria-hidden="true" />
              Contacts
            </NavLink>
          </li>
          <li>
            <NavLink to="/activity" className={navLinkClassName}>
              <Activity className="size-6" aria-hidden="true" />
              Activity
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={navLinkClassName}>
              {({ isActive }) => (
                <>
                  {me && (
                    <PersonAvatar
                      id={me.id}
                      name={me.name ?? me.email}
                      size="sm"
                      className={cn(isActive && 'ring-2 ring-foreground')}
                    />
                  )}
                  Profile
                </>
              )}
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  )
}
