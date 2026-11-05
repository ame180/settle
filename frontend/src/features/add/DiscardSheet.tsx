import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type DiscardSheetProps = {
  open: boolean
  /** "Discard this expense?" */
  title: string
  onDiscard: () => void
  onKeepEditing: () => void
}

/** Asked when the user leaves a form with input in it. Swiping it down keeps editing. */
export function DiscardSheet({ open, title, onDiscard, onKeepEditing }: DiscardSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onKeepEditing()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>What you’ve entered won’t be saved.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <button
            type="button"
            onClick={onDiscard}
            className="h-12 rounded-full bg-destructive text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onKeepEditing}
            className="h-12 rounded-full border border-border-strong text-base font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Keep editing
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
