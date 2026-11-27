import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { BackLink } from '@/components/BackLink'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DeleteAndGoBack } from './useDeleteAndGoBack'

export const detailBackFallback = '/activity'

type DetailScreenProps = {
  title: string
  /** Header actions; shown only once the item has loaded. */
  trailing?: ReactNode
  /** Pinned below the scrolling content, such as a comment input. */
  footer?: ReactNode
  children: ReactNode
}

export function DetailScreen({ title, trailing, footer, children }: DetailScreenProps) {
  const { t } = useLingui()
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={title}
        leading={<BackLink to={detailBackFallback} label={t`Back`} />}
        trailing={trailing}
      />
      <main
        className={cn(
          'flex flex-1 flex-col overflow-y-auto',
          footer ? 'pb-4' : 'pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
        )}
      >
        {children}
      </main>
      {footer}
    </div>
  )
}

export function NoteBlock({ note }: { note: string | null }) {
  if (!note) {
    return null
  }
  return (
    <div className="mx-4 mt-3 flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">
        <Trans>Note</Trans>
      </span>
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
  confirmNote?: ReactNode
  deletion: DeleteAndGoBack
}

/** Header trash and Edit buttons, plus the trash's confirm sheet. */
export function DetailActions({
  editTo,
  editLabel,
  deleteLabel,
  confirmTitle,
  confirmDescription,
  confirmNote,
  deletion,
}: DetailActionsProps) {
  const { t } = useLingui()
  const { isConfirmOpen, setConfirmOpen, confirm, isPending } = deletion
  return (
    <>
      <ConfirmSheet
        trigger={
          <Button variant="ghost" size="icon" className="[&_svg]:size-5.5" aria-label={deleteLabel}>
            <Trash2 aria-hidden="true" />
          </Button>
        }
        open={isConfirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        note={confirmNote}
        confirmLabel={deleteLabel}
        onConfirm={confirm}
        pending={isPending}
        pendingLabel={t`Deleting…`}
      />
      <Link
        to={editTo}
        aria-label={editLabel}
        className="flex h-11 items-center rounded-full px-3 text-base font-semibold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Trans>Edit</Trans>
      </Link>
    </>
  )
}
