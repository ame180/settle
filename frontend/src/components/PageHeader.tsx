import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  /** Omit when the screen's own heading sits below the bar. */
  title?: string
  leading?: ReactNode
  trailing?: ReactNode
}

export function PageHeader({ title, leading, trailing }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background pt-[env(safe-area-inset-top)]">
      <div className={cn('flex h-14 items-center gap-1 pr-1.5', leading ? 'pl-1.5' : 'pl-4')}>
        {leading}
        {title === undefined ? (
          <div className="flex-1" />
        ) : (
          <h1 className="flex-1 text-xl font-semibold">{title}</h1>
        )}
        {trailing}
      </div>
    </header>
  )
}
