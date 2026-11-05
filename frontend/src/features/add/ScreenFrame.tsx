import type { ReactNode } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { CloseIcon, IconButton } from './formParts'

/** Full-screen form header: a close button, no bottom nav. */
export function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <PageHeader
      title={title}
      leading={
        <IconButton aria-label="Close" onClick={onClose}>
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
