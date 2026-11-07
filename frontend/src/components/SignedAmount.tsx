import type { ReactNode } from 'react'
import { balanceTextClassName, type BalanceDirection } from '@/lib/money'
import { cn } from '@/lib/utils'

/** A row's right-hand balance: a small label over the amount, coloured by direction. */
export function SignedAmount({
  direction,
  label,
  children,
}: {
  direction: BalanceDirection
  /** "you lent", "owes you" */
  label: string
  /** The formatted amount. */
  children: ReactNode
}) {
  return (
    <span
      className={cn('flex shrink-0 flex-col items-end gap-0.5', balanceTextClassName[direction])}
    >
      <span className="text-xs">{label}</span>{' '}
      <span className="text-[17px] font-semibold tabular-nums">{children}</span>
    </span>
  )
}
