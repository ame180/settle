import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StateMessageProps = {
  icon: ReactNode
  iconClassName?: string
  title: string
  description: string
  role?: 'alert'
  compact?: boolean
  children?: ReactNode
}

export function StateMessage({
  icon,
  iconClassName,
  title,
  description,
  role,
  compact = false,
  children,
}: StateMessageProps) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-3 px-8 text-center',
        compact ? 'pt-24' : 'pt-40',
      )}
    >
      <span
        className={cn(
          'flex size-16 items-center justify-center rounded-full bg-muted text-foreground/80',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      <p className="text-[15px] text-muted-foreground">{description}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
