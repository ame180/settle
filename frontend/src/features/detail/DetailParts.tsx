import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { BackLink } from '@/components/BackLink'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
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
        confirmLabel={deleteLabel}
        onConfirm={confirm}
        pending={isPending}
        pendingLabel="Deleting…"
      />
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
