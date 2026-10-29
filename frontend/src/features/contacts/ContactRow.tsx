import type { ContactListItem } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { formatPln, isNegativeAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

type ContactRowProps = {
  contact: ContactListItem
  plnBalance: string | null
}

export function ContactRow({ contact, plnBalance }: ContactRowProps) {
  const { person } = contact

  return (
    <li className="flex min-h-17 items-center gap-3.5 px-4 py-2.5">
      <PersonAvatar id={person.id} name={person.displayName} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('truncate', plnBalance === null && 'text-foreground/80')}>
          {person.displayName}
        </span>
        {!contact.isRegistered && (
          <span className="text-[13px] text-muted-foreground">Not on Settle yet</span>
        )}
      </div>
      {plnBalance === null ? (
        <span className="shrink-0 text-[13px] text-muted-foreground">settled up</span>
      ) : (
        <BalanceAmount amount={plnBalance} />
      )}
    </li>
  )
}

function BalanceAmount({ amount }: { amount: string }) {
  const youOwe = isNegativeAmount(amount)

  return (
    <span
      className={cn(
        'flex shrink-0 flex-col items-end gap-0.5',
        youOwe ? 'text-negative' : 'text-positive',
      )}
    >
      <span className="text-xs">{youOwe ? 'you owe' : 'owes you'}</span>
      <span className="text-[17px] font-semibold tabular-nums">{formatPln(amount)}</span>
    </span>
  )
}
