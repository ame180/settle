import type { ReactNode } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { DetailNotFound } from '@/features/detail/DetailParts'
import { useGoBack } from '@/lib/useGoBack'
import { Button } from '@/components/ui/button'
import { CloseIcon } from './formParts'
import { useIsSaving } from './navigation'

/**
 * Full-screen form header: a close button, no bottom nav. Close waits while anything is saving,
 * so a save can't land after the user was told their input was discarded.
 */
export function Header({ title, onClose }: { title: string; onClose: () => void }) {
  const saving = useIsSaving()
  return (
    <PageHeader
      title={title}
      leading={
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} disabled={saving}>
          <CloseIcon />
        </Button>
      }
    />
  )
}

export function Frame({
  title,
  onClose,
  body,
}: {
  title: string
  onClose: () => void
  body: ReactNode
}) {
  return (
    <div className="flex h-full flex-col">
      <Header title={title} onClose={onClose} />
      {body}
    </div>
  )
}

/** An edit screen whose URL has no usable id. */
export function NotFoundFrame({ title, noun }: { title: string; noun: string }) {
  const { goBack } = useGoBack('/activity')
  return <Frame title={title} onClose={goBack} body={<DetailNotFound noun={noun} />} />
}
