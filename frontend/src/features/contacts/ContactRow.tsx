import { Link } from 'react-router'
import type { ContactListItem } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { SignedAmount } from '@/components/SignedAmount'
import { balanceDirection, findPlnAmount, formatPln, isNegativeAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

type ContactRowProps = {
  contact: ContactListItem
  /** Rows in the settled-up section, hidden from the main list after a quiet spell. */
  settled?: boolean
}

export function ContactRow({ contact, settled = false }: ContactRowProps) {
  const { person } = contact
  const plnBalance = findPlnAmount(contact.balances)

  return (
    <li>
      <Link
        to={`/contacts/${person.id}`}
        className="flex min-h-17 items-center gap-3.5 px-4 py-2.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset active:bg-muted"
      >
        <PersonAvatar id={person.id} name={person.displayName} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn('truncate', settled && 'text-foreground/80')}>
            {person.displayName}
          </span>
          {!contact.isRegistered && (
            <span className="text-[13px] text-muted-foreground">Not on Settle yet</span>
          )}
        </div>
        {plnBalance === null ? (
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {settled ? 'settled up' : noPlnBalanceLabel(contact)}
          </span>
        ) : (
          <SignedAmount
            direction={balanceDirection(plnBalance)}
            label={isNegativeAmount(plnBalance) ? 'you owe' : 'owes you'}
          >
            {formatPln(plnBalance)}
          </SignedAmount>
        )}
      </Link>
    </li>
  )
}

// The list only shows PLN for now, so a balance in another currency must not read as "none".
function noPlnBalanceLabel(contact: ContactListItem): string {
  return contact.balances.length === 0 ? 'no balance' : 'no PLN balance'
}
