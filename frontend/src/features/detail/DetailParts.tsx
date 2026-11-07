import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LoaderCircle, Lock, SearchX, Trash2 } from 'lucide-react'
import { ApiError } from '@/api/client'
import { BackLink } from '@/components/BackLink'
import { PageHeader } from '@/components/PageHeader'
import { LoadError } from '@/components/LoadError'
import { Spinner } from '@/components/Spinner'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import { buttonClassName } from '@/components/ui/button-variants'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { DeleteAndGoBack } from './useDeleteAndGoBack'

export const detailBackFallback = '/activity'

type DetailScreenProps = {
  title: string
  /** Header actions; shown only once the item has loaded. */
  trailing?: ReactNode
  children: ReactNode
}

export function DetailScreen({ title, trailing, children }: DetailScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={title}
        leading={<BackLink to={detailBackFallback} label="Back" />}
        trailing={trailing}
      />
      <main className="flex flex-1 flex-col overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  )
}

export function DetailLoading({ label }: { label: string }) {
  return <Spinner label={label} className="pt-40" />
}

type DetailErrorProps = {
  error: Error
  /** "expense" or "payment" */
  noun: string
  onRetry: () => void
  isRetrying: boolean
}

export function DetailError({ error, noun, onRetry, isRetrying }: DetailErrorProps) {
  const status = error instanceof ApiError ? error.status : undefined

  if (status === 404) {
    return (
      <StateMessage
        icon={<SearchX className="size-7.5" aria-hidden="true" />}
        title={`This ${noun} doesn’t exist`}
        description="It may have been deleted."
      >
        <BackToActivity />
      </StateMessage>
    )
  }

  if (status === 403) {
    return (
      <StateMessage
        icon={<Lock className="size-7.5" aria-hidden="true" />}
        title={`You can’t see this ${noun}`}
        description="Only the people in it can open it."
      >
        <BackToActivity />
      </StateMessage>
    )
  }

  return (
    <LoadError title={`Couldn’t load this ${noun}`} onRetry={onRetry} isRetrying={isRetrying} />
  )
}

function BackToActivity() {
  return (
    <Link to="/activity" className={buttonClassName({ variant: 'outline', size: 'pill' })}>
      Go to activity
    </Link>
  )
}

export function NoteBlock({ note }: { note: string | null }) {
  if (!note) {
    return null
  }
  return (
    <div className="mx-4 mt-3 flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">Note</span>
      <p className="text-[15px] leading-[1.45] break-words whitespace-pre-line">{note}</p>
    </div>
  )
}

type DetailActionsProps = {
  editTo: string
  /** "Edit expense" */
  editLabel: string
  /** "Delete expense"; also the confirm button's label. */
  deleteLabel: string
  confirmTitle: string
  confirmDescription: string
  deletion: DeleteAndGoBack
}

/** Header trash and Edit buttons, plus the trash's confirm sheet. */
export function DetailActions({
  editTo,
  editLabel,
  deleteLabel,
  confirmTitle,
  confirmDescription,
  deletion,
}: DetailActionsProps) {
  const { isConfirmOpen, setConfirmOpen, confirm, isPending } = deletion
  return (
    <>
      <Sheet open={isConfirmOpen} onOpenChange={(next) => !isPending && setConfirmOpen(next)}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="[&_svg]:size-5.5" aria-label={deleteLabel}>
            <Trash2 aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader className="pt-3">
            <SheetTitle className="break-words">{confirmTitle}</SheetTitle>
            <SheetDescription className="leading-[1.45]">{confirmDescription}</SheetDescription>
          </SheetHeader>
          <SheetFooter className="pb-6">
            <Button
              variant="destructive"
              className="h-12 rounded-full text-base font-semibold"
              onClick={confirm}
              disabled={isPending}
            >
              {isPending && (
                <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
              )}
              {isPending ? 'Deleting…' : deleteLabel}
            </Button>
            <SheetClose asChild>
              <Button
                variant="outline"
                className="h-12 rounded-full text-base"
                disabled={isPending}
              >
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <Link
        to={editTo}
        aria-label={editLabel}
        className="flex h-11 items-center rounded-full px-3 text-base font-semibold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Edit
      </Link>
    </>
  )
}
