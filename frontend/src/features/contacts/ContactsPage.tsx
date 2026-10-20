import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { CircleAlert, CircleCheck, RefreshCw, UserPlus, Users } from 'lucide-react'
import { useContacts } from '@/api/contacts'
import type { ContactListItem, ContactListResponse } from '@/api/types'
import { AddExpenseButton } from '@/components/AddExpenseButton'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { findPlnAmount, formatPln, isNegativeAmount } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ContactRow } from './ContactRow'

export type ContactsLocationState = { addedContactName?: string } | null

const TOAST_DURATION_MS = 4000

const pillClassName = 'rounded-full px-5 text-[15px]'

export function ContactsPage() {
  const contactsQuery = useContacts()
  const location = useLocation()
  const navigate = useNavigate()
  const [addedContactName, setAddedContactName] = useState(
    () => (location.state as ContactsLocationState)?.addedContactName ?? null,
  )

  useEffect(() => {
    if (location.state === null) {
      return
    }
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (addedContactName === null) {
      return
    }
    const timeoutId = setTimeout(() => setAddedContactName(null), TOAST_DURATION_MS)
    return () => clearTimeout(timeoutId)
  }, [addedContactName])

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
        ) : contactsQuery.isError ? (
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

      {addedContactName !== null && (
        <div
          role="status"
          className="fixed right-4 bottom-[calc(9.25rem+env(safe-area-inset-bottom))] left-4 z-20 flex items-center gap-2.5 rounded-xl bg-primary px-4 py-3.5 text-[15px] text-primary-foreground shadow-[0_6px_20px_rgb(0_0_0/0.2)]"
        >
          <CircleCheck className="size-5 shrink-0 text-emerald-300" aria-hidden="true" />
          {addedContactName} added to your contacts
        </div>
      )}
    </>
  )
}

function ContactList({ contacts }: { contacts: ContactListResponse }) {
  const [showSettled, setShowSettled] = useState(false)

  const withBalance: { contact: ContactListItem; plnBalance: string }[] = []
  const settled: ContactListItem[] = []
  for (const contact of contacts.items) {
    const plnBalance = findPlnAmount(contact.balances)
    if (plnBalance === null) {
      settled.push(contact)
      continue
    }
    withBalance.push({ contact, plnBalance })
  }

  const showSettledLabel = `Show ${settled.length} settled-up ${settled.length === 1 ? 'contact' : 'contacts'}`

  if (withBalance.length === 0 && !showSettled) {
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
      <BalanceSummary total={findPlnAmount(contacts.totals)} hasBalances={withBalance.length > 0} />

      {withBalance.length > 0 && (
        <ul>
          {withBalance.map(({ contact, plnBalance }) => (
            <ContactRow key={contact.person.id} contact={contact} plnBalance={plnBalance} />
          ))}
        </ul>
      )}

      {settled.length > 0 && showSettled && (
        <section aria-labelledby="settled-up-heading">
          <h2
            id="settled-up-heading"
            className={cn(
              'mx-4 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase',
              withBalance.length > 0 && 'mt-3 border-t pt-4',
            )}
          >
            Settled up
          </h2>
          <ul>
            {settled.map((contact) => (
              <ContactRow key={contact.person.id} contact={contact} plnBalance={null} />
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

type StateMessageProps = {
  icon: ReactNode
  iconClassName?: string
  title: string
  description: string
  role?: 'alert'
  compact?: boolean
  children: ReactNode
}

function StateMessage({
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
      <div className="mt-3">{children}</div>
    </div>
  )
}

const skeletonNameWidths = ['62%', '38%', '54%', '70%', '46%', '58%']

function ContactsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading contacts">
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
