import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type ConfirmSheetProps = {
  /** The button that opens it; focus returns there when the sheet closes. */
  trigger?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  /** The destructive action: "Delete expense", "Discard". */
  confirmLabel: string
  onConfirm: () => void
  cancelLabel?: string
  /** While the action runs the sheet stays open and its buttons are disabled. */
  pending?: boolean
  pendingLabel?: string
}

/** Bottom sheet asking to confirm a destructive action. Swiping it down cancels. */
export function ConfirmSheet({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancel',
  pending = false,
  pendingLabel,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent>
        <SheetHeader className="pt-3">
          <SheetTitle className="break-words">{title}</SheetTitle>
          <SheetDescription className="leading-[1.45]">{description}</SheetDescription>
        </SheetHeader>
        <SheetFooter className="pb-6">
          <Button
            variant="destructive"
            className="h-12 rounded-full text-base font-semibold"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />}
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-full text-base"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
