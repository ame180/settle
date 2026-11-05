import type { ReactNode } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { CloseIcon, IconButton } from './formParts'

/**
 * Full-screen form header: a close button, no bottom nav. Close waits while anything is saving,
 * so a save can't land after the user was told their input was discarded.
 */
export function Header({ title, onClose }: { title: string; onClose: () => void }) {
  const saving = useIsMutating() > 0
  return (
    <PageHeader
      title={title}
      leading={
        <IconButton aria-label="Close" onClick={onClose} disabled={saving}>
          <CloseIcon />
        </IconButton>
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

export function Loading() {
  return <p className="p-4 text-muted-foreground">Loading…</p>
}
