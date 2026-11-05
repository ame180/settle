import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CircleAlert, LoaderCircle, Lock, Pencil, RefreshCw, SearchX } from 'lucide-react'
import { ApiError } from '@/api/client'
import { BackLink } from '@/components/BackLink'
import { PageHeader } from '@/components/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export const detailBackFallback = '/activity'

type DetailScreenProps = {
  title: string
  /** Header action, e.g. the edit pencil; shown only once the item has loaded. */
  trailing?: ReactNode
  children: ReactNode
}

export function DetailScreen({ title, trailing, children }: DetailScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={title}
        leading={<BackLink fallback={detailBackFallback} />}
        trailing={trailing}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  )
}

export function EditLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Pencil className="size-5.5" aria-hidden="true" />
    </Link>
  )
}

export function DetailLoading({ label }: { label: string }) {
  return (
    <div role="status" className="flex justify-center pt-40 text-muted-foreground">
      <LoaderCircle className="size-7 motion-safe:animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
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
        description={`Only the people in a ${noun} can open it.`}
      >
        <BackToActivity />
      </StateMessage>
    )
  }

  return (
    <StateMessage
      role="alert"
      icon={<CircleAlert className="size-7.5" aria-hidden="true" />}
      iconClassName="bg-destructive/10 text-destructive"
      title={`Couldn’t load this ${noun}`}
      description="Check your connection and try again."
    >
      <Button
        variant="outline"
        className="rounded-full px-5 text-[15px]"
        onClick={onRetry}
        disabled={isRetrying}
      >
        <RefreshCw aria-hidden="true" />
        Try again
      </Button>
    </StateMessage>
  )
}

function BackToActivity() {
  return (
    <Link
      to="/activity"
      className="inline-flex h-11 items-center rounded-full border border-input px-5 text-[15px] font-medium hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
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

type DeleteSectionProps = {
  /** "Delete expense" */
  actionLabel: string
  title: string
  description: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

/** The red text button at the bottom of a detail screen and its confirm sheet. */
export function DeleteSection({
  actionLabel,
  title,
  description,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteSectionProps) {
  return (
    <div className="mt-auto flex justify-center px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <Sheet open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="h-11 rounded-full px-5 text-[15px] font-semibold text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {actionLabel}
        </button>
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
              disabled={isPending}
            >
              {isPending && (
                <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
              )}
              {isPending ? 'Deleting…' : actionLabel}
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
    </div>
  )
}
