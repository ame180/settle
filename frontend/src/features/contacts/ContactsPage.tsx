import { useState } from 'react'
import { Link } from 'react-router'
import { CircleAlert, CircleCheck, RefreshCw, UserPlus, Users } from 'lucide-react'
import { useContacts } from '@/api/contacts'
import type { ContactListItem, ContactListResponse } from '@/api/types'
import { AddExpenseButton } from '@/components/AddExpenseButton'
import { PageHeader } from '@/components/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import { findPlnAmount, formatPln, isNegativeAmount } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ContactRow } from './ContactRow'
import { isHiddenAsSettled } from './contactVisibility'

const pillClassName = 'rounded-full px-5 text-[15px]'

export function ContactsPage() {
  const contactsQuery = useContacts()

  return (
    <>
      <PageHeader
        title="Contacts"
        trailing={
          <Link
            to="/contacts/new"
            aria-label="Add contact"
            className="flex size-11 items-center justify-center rounded-full hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <UserPlus className="size-6" aria-hidden="true" />
          </Link>
        }
      />

      <div className="pb-32">
        {contactsQuery.isPending ? (
          <ContactsSkeleton />
        ) : contactsQuery.data === undefined ? (
          <StateMessage
            role="alert"
            icon={<CircleAlert className="size-7.5" aria-hidden="true" />}
            iconClassName="bg-destructive/10 text-destructive"
            title="Couldn't load contacts"
            description="Check your connection and try again."
          >
            <Button
              variant="outline"
              className={pillClassName}
              onClick={() => contactsQuery.refetch()}
              disabled={contactsQuery.isFetching}
            >
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          </StateMessage>
        ) : contactsQuery.data.items.length === 0 ? (
          <StateMessage
            icon={<Users className="size-7.5" aria-hidden="true" />}
            title="No contacts yet"
            description="Add an expense with someone, or add a contact by email."
          >
            <Link
              to="/contacts/new"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-input bg-background px-5 text-[15px] font-medium hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <UserPlus className="size-4.5" aria-hidden="true" />
              Add contact
            </Link>
          </StateMessage>
        ) : (
          <ContactList contacts={contactsQuery.data} />
        )}
      </div>

      <AddExpenseButton />
    </>
  )
}

function ContactList({ contacts }: { contacts: ContactListResponse }) {
  const [showSettled, setShowSettled] = useState(false)
  const [now] = useState(() => new Date())

  const visible: ContactListItem[] = []
  const settled: ContactListItem[] = []
  for (const contact of contacts.items) {
    if (isHiddenAsSettled(contact, now)) {
      settled.push(contact)
      continue
    }
    visible.push(contact)
  }
  const hasPlnBalances = visible.some((contact) => findPlnAmount(contact.balances) !== null)

  const showSettledLabel = `Show ${settled.length} settled-up ${settled.length === 1 ? 'contact' : 'contacts'}`

  if (visible.length === 0 && !showSettled) {
    return (
      <>
        <BalanceSummary total={null} />
        <StateMessage
          compact
          icon={<CircleCheck className="size-8" aria-hidden="true" />}
          iconClassName="text-positive"
          title="Nothing to settle"
          description="Nobody owes you and you owe nobody."
        >
          <Button variant="outline" className={pillClassName} onClick={() => setShowSettled(true)}>
            {showSettledLabel}
          </Button>
        </StateMessage>
      </>
    )
  }

  return (
    <>
      <BalanceSummary total={findPlnAmount(contacts.totals)} hasBalances={hasPlnBalances} />

      {visible.length > 0 && (
        <ul>
          {visible.map((contact) => (
            <ContactRow key={contact.person.id} contact={contact} />
          ))}
        </ul>
      )}

      {settled.length > 0 && showSettled && (
        <section aria-labelledby="settled-up-heading">
          <h2
            id="settled-up-heading"
            className={cn(
              'mx-4 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase',
              visible.length > 0 && 'mt-3 border-t pt-4',
            )}
          >
            Settled up
          </h2>
          <ul>
            {settled.map((contact) => (
              <ContactRow key={contact.person.id} contact={contact} settled />
            ))}
          </ul>
          <div className="flex justify-center px-4 pt-4">
            <Button
              variant="outline"
              className={pillClassName}
              onClick={() => setShowSettled(false)}
            >
              Hide settled-up contacts
            </Button>
          </div>
        </section>
      )}

      {settled.length > 0 && !showSettled && (
        <div className="flex flex-col items-center gap-3 px-4 pt-6">
          <p className="text-sm text-muted-foreground">Settled-up contacts are hidden.</p>
          <Button variant="outline" className={pillClassName} onClick={() => setShowSettled(true)}>
            {showSettledLabel}
          </Button>
        </div>
      )}
    </>
  )
}

function BalanceSummary({
  total,
  hasBalances = false,
}: {
  total: string | null
  hasBalances?: boolean
}) {
  if (total === null) {
    return (
      <p className="px-4 pt-5 pb-3 text-lg">
        {hasBalances ? 'Overall, you are even' : 'You are all settled up'}
      </p>
    )
  }

  const youOwe = isNegativeAmount(total)

  return (
    <p className="px-4 pt-5 pb-3 text-lg">
      {youOwe ? 'Overall, you owe' : 'Overall, you are owed'}{' '}
      <span
        className={cn('font-semibold tabular-nums', youOwe ? 'text-negative' : 'text-positive')}
      >
        {formatPln(total)}
      </span>
    </p>
  )
}

const skeletonNameWidths = ['62%', '38%', '54%', '70%', '46%', '58%']

function ContactsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading contacts</span>
      <div className="px-4 pt-6 pb-4">
        <div className="h-4.5 w-60 motion-safe:animate-pulse rounded-md bg-muted" />
      </div>
      {skeletonNameWidths.map((width) => (
        <div key={width} className="flex min-h-17 items-center gap-3.5 px-4 py-2.5">
          <div className="size-11 shrink-0 motion-safe:animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 motion-safe:animate-pulse rounded bg-muted" style={{ width }} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="h-2.5 w-12 motion-safe:animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-19 motion-safe:animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
