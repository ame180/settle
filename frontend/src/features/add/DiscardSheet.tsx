import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { LeaveGuard } from './navigation'

type DiscardSheetProps = {
  guard: Pick<LeaveGuard, 'blocked' | 'discard' | 'keepEditing'>
  /** "Discard this expense?" */
  title: string
}

/** Asked when the user leaves a form with input in it. Swiping it down keeps editing. */
export function DiscardSheet({ guard, title }: DiscardSheetProps) {
  return (
    <Sheet open={guard.blocked} onOpenChange={(next) => !next && guard.keepEditing()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>What you’ve entered won’t be saved.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <button
            type="button"
            onClick={guard.discard}
            className="h-12 rounded-full bg-destructive text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={guard.keepEditing}
            className="h-12 rounded-full border border-border-strong text-base font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Keep editing
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
