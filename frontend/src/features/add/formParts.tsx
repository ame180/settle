import type * as React from 'react'
import { AlertLine } from '@/components/FieldError'
import { cn } from '@/lib/utils'

/** Rounded secondary button used for the date and note chips and sheet options. */
export function PillButton({
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border-strong bg-background px-4 text-[15px] font-medium whitespace-nowrap transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-secondary disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

/** The pinned bottom of a form: the save-failed banner, anything else, then the button. */
export function FormFooter({
  serverError,
  children,
}: {
  serverError: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-t px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {serverError && <AlertLine message={serverError} />}
      {children}
    </div>
  )
}
