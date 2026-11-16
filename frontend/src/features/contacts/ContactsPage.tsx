import { useState } from 'react'
import { Link } from 'react-router'
import { CircleCheck, UserPlus, Users } from 'lucide-react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useContacts } from '@/api/contacts'
import type { ContactListItem, ContactListResponse } from '@/api/types'
import { AddExpenseButton } from '@/components/AddExpenseButton'
import { PageHeader } from '@/components/PageHeader'
import { LoadError } from '@/components/LoadError'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import { buttonClassName } from '@/components/ui/button-variants'
import { balanceDirection, balanceTextClassName, findPlnAmount, formatPln } from '@/lib/money'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ContactRow } from './ContactRow'
import { isHiddenAsSettled } from './contactVisibility'

export function ContactsPage() {
  const { t } = useLingui()
  const contactsQuery = useContacts()

  return (
    <>
      <PageHeader
        title={t`Contacts`}
        trailing={
          <Link
            to="/contacts/new"
            aria-label={t`Add contact`}
            className={buttonClassName({ variant: 'ghost', size: 'icon' })}
          >
            <UserPlus className="size-6" aria-hidden="true" />
          </Link>
        }
      />

      <div className="pb-32">
        {contactsQuery.isPending ? (
          <ContactsSkeleton />
        ) : contactsQuery.data === undefined ? (
          <LoadError
            title={t`Couldn't load contacts`}
            onRetry={() => contactsQuery.refetch()}
            isRetrying={contactsQuery.isFetching}
          />
        ) : contactsQuery.data.items.length === 0 ? (
          <StateMessage
            icon={<Users className="size-7.5" aria-hidden="true" />}
            title={t`No contacts yet`}
            description={t`Add an expense with someone, or add a contact by email.`}
          >
            <Link
              to="/contacts/new"
              className={buttonClassName({
                variant: 'outline',
                size: 'pill',
                className: '[&_svg]:size-4.5',
              })}
            >
              <UserPlus aria-hidden="true" />
              <Trans>Add contact</Trans>
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
  const { t } = useLingui()
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

  const showSettledLabel = (
    <Plural
      value={settled.length}
      one="Show # settled-up contact"
      other="Show # settled-up contacts"
    />
  )

  if (visible.length === 0 && !showSettled) {
    return (
      <>
        <BalanceSummary total={null} />
        <StateMessage
          compact
          icon={<CircleCheck className="size-8" aria-hidden="true" />}
          iconClassName="text-positive"
          title={t`Nothing to settle`}
          description={t`Nobody owes you and you owe nobody.`}
        >
          <Button variant="outline" size="pill" onClick={() => setShowSettled(true)}>
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
            <Trans>Settled up</Trans>
          </h2>
          <ul>
            {settled.map((contact) => (
              <ContactRow key={contact.person.id} contact={contact} settled />
            ))}
          </ul>
          <div className="flex justify-center px-4 pt-4">
            <Button variant="outline" size="pill" onClick={() => setShowSettled(false)}>
              <Trans>Hide settled-up contacts</Trans>
            </Button>
          </div>
        </section>
      )}

      {settled.length > 0 && !showSettled && (
        <div className="flex flex-col items-center gap-3 px-4 pt-6">
          <p className="text-sm text-muted-foreground">
            <Trans>Settled-up contacts are hidden.</Trans>
          </p>
          <Button variant="outline" size="pill" onClick={() => setShowSettled(true)}>
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
        {hasBalances ? <Trans>Overall, you are even</Trans> : <Trans>You are all settled up</Trans>}
      </p>
    )
  }

  const direction = balanceDirection(total)
  const amount = formatPln(total)
  const amountClassName = cn('font-semibold tabular-nums', balanceTextClassName[direction])

  return (
    <p className="px-4 pt-5 pb-3 text-lg">
      {direction === 'owe' ? (
        <Trans>
          Overall, you owe <span className={amountClassName}>{amount}</span>
        </Trans>
      ) : (
        <Trans>
          Overall, you are owed <span className={amountClassName}>{amount}</span>
        </Trans>
      )}
    </p>
  )
}

const skeletonNameWidths = ['62%', '38%', '54%', '70%', '46%', '58%']

function ContactsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">
        <Trans>Loading contacts</Trans>
      </span>
      <div className="px-4 pt-6 pb-4">
        <Skeleton className="h-4.5 w-60 rounded-md" />
      </div>
      {skeletonNameWidths.map((width) => (
        <div key={width} className="flex min-h-17 items-center gap-3.5 px-4 py-2.5">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5" style={{ width }} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-3.5 w-19" />
          </div>
        </div>
      ))}
    </div>
  )
}
