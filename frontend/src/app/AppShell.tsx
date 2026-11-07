import { useLayoutEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Activity, Users } from 'lucide-react'
import { useMe } from '@/api/auth'
import { PersonAvatar } from '@/components/PersonAvatar'
import { cn } from '@/lib/utils'
import { ownDisplayName } from '@/lib/person'

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground',
    isActive && 'font-semibold text-foreground',
  )

// <main> is the scroll container and outlives its screens, so each history entry keeps its own
// position: a new screen opens at the top, going back returns to where you were. Module scope keeps
// it across screens outside the shell, such as an expense opened from a contact.
const scrollPositions = new Map<string, number>()

export function AppShell() {
  const { data: me } = useMe()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (mainRef.current !== null) {
      mainRef.current.scrollTop = scrollPositions.get(location.key) ?? 0
    }
  }, [location.key])

  // A contact's screens belong to the Contacts tab.
  const isContactsActive = location.pathname === '/' || location.pathname.startsWith('/contacts/')

  return (
    <div className="flex h-full flex-col">
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto"
        onScroll={(event) => scrollPositions.set(location.key, event.currentTarget.scrollTop)}
      >
        <Outlet />
      </main>

      <nav aria-label="Main" className="border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-3">
          <li>
            <Link
              to="/"
              aria-current={isContactsActive ? 'page' : undefined}
              className={navLinkClassName({ isActive: isContactsActive })}
            >
              <Users className="size-6" aria-hidden="true" />
              Contacts
            </Link>
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
                      name={ownDisplayName(me)}
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
