import { NavLink, Outlet, useNavigate } from 'react-router'
import { List, Plus, Users, LogOut } from 'lucide-react'
import { useLogout, useMe } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Feed', icon: List, end: true },
  { to: '/add', label: 'Add', icon: Plus, end: false },
  { to: '/contacts', label: 'Contacts', icon: Users, end: false },
]

export function AppShell() {
  const { data: me } = useMe()
  const logoutMutation = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)]">
        <div className="py-3">
          <div className="text-lg font-semibold">Settle</div>
          {me && <div className="text-xs text-muted-foreground">{me.email}</div>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Log out"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Outlet />
      </main>

      <nav className="border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground',
                    isActive && 'text-foreground',
                  )
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
