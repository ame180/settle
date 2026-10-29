import { Link } from 'react-router'
import { Plus } from 'lucide-react'

export function AddExpenseButton() {
  return (
    <Link
      to="/add"
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex h-13 items-center gap-2 rounded-full bg-primary pr-5.5 pl-4 text-base font-semibold text-primary-foreground shadow-[0_4px_14px_rgb(0_0_0/0.18)] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary/85"
    >
      <Plus className="size-5.5" strokeWidth={2.25} aria-hidden="true" />
      Add expense
    </Link>
  )
}
