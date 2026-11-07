import type * as React from 'react'
import { AlertLine } from '@/components/FieldError'

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
