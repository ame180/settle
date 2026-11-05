import { CircleAlert, CircleCheck } from 'lucide-react'
import { Toaster as Sonner } from 'sonner'

// Mounted once in main.tsx; show toasts with `toast()` / `toast.success()` from 'sonner'.
// Sits above the bottom nav and the Add expense button, as on the approved toast boards.
const bottomOffset = 'calc(9.25rem + env(safe-area-inset-bottom))'
// Sonner sizes the toast from the left offset, so left and right must stay equal to centre it.
const columnInset = 'calc(var(--app-inset-x) + 1rem)'

function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: bottomOffset }}
      mobileOffset={{ bottom: bottomOffset, left: columnInset, right: columnInset }}
      icons={{
        success: <CircleCheck className="size-5 text-emerald-300" aria-hidden="true" />,
        error: <CircleAlert className="size-5 text-red-300" aria-hidden="true" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-2.5 rounded-xl bg-primary px-4 py-3.5 text-[15px] text-primary-foreground shadow-[0_6px_20px_rgb(0_0_0/0.2)]',
          icon: 'shrink-0',
        },
      }}
    />
  )
}

export { Toaster }
