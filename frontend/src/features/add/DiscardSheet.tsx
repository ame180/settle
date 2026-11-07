import { ConfirmSheet } from '@/components/ConfirmSheet'
import type { LeaveGuard } from './navigation'

type DiscardSheetProps = {
  guard: Pick<LeaveGuard, 'blocked' | 'discard' | 'keepEditing'>
  /** "Discard this expense?" */
  title: string
}

/** Asked when the user leaves a form with input in it. Swiping it down keeps editing. */
export function DiscardSheet({ guard, title }: DiscardSheetProps) {
  return (
    <ConfirmSheet
      open={guard.blocked}
      onOpenChange={(next) => !next && guard.keepEditing()}
      title={title}
      description="What you’ve entered won’t be saved."
      confirmLabel="Discard"
      onConfirm={guard.discard}
      cancelLabel="Keep editing"
    />
  )
}
