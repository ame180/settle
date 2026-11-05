import { Link, useParams } from 'react-router'
import { Activity, CircleAlert, CircleCheck, Pencil, RefreshCw } from 'lucide-react'
import { useActivity } from '@/api/activity'
import { useMe } from '@/api/auth'
import { useContact } from '@/api/contacts'
import type { ContactListItem } from '@/api/types'
import { AddExpenseButton } from '@/components/AddExpenseButton'
import { BackLink } from '@/components/BackLink'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import { addExpenseWithPath, contactSecondaryLine, settleUpPath } from '@/lib/contact'
import { getShortName } from '@/lib/person'
import { findPlnAmount, formatPln, isNegativeAmount } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ActivityListFooter } from '@/features/activity/ActivityListFooter'
import { ActivityRow } from '@/features/activity/ActivityRows'
import { activityItemKey, flattenActivityPages } from '@/features/activity/activityItems'
import { ContactNotFound, ContactNotFoundMessage } from './ContactNotFound'
import { parseUserId } from './parseUserId'

const pillClassName = 'rounded-full px-5 text-[15px]'

export function ContactPage() {
  const userId = parseUserId(useParams().userId)

  return userId === null ? <ContactNotFound /> : <ContactView userId={userId} />
}

function ContactView({ userId }: { userId: number }) {
  const contactQuery = useContact(userId)
  const contact = contactQuery.data

  return (
    <>
      <PageHeader
        leading={<BackLink to="/" label="Back to contacts" />}
        trailing={
          contact && (
            <Link
              to={`/contacts/${userId}/edit`}
              aria-label="Edit contact"
              className="flex size-11 items-center justify-center rounded-full hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Pencil className="size-5.5" aria-hidden="true" />
            </Link>
          )
        }
      />

      <div className="pb-32">
        {contactQuery.isPending ? (
          <ContactSkeleton />
        ) : contact === undefined ? (
          <StateMessage
            role="alert"
            icon={<CircleAlert className="size-7.5" aria-hidden="true" />}
            iconClassName="bg-destructive/10 text-destructive"
            title="Couldn't load contact"
            description="Check your connection and try again."
          >
            <Button
              variant="outline"
              className={pillClassName}
              onClick={() => contactQuery.refetch()}
              disabled={contactQuery.isFetching}
            >
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          </StateMessage>
        ) : contact === null ? (
          <ContactNotFoundMessage />
        ) : (
          <ContactDetails contact={contact} />
        )}
      </div>

      {contact && <AddExpenseButton to={addExpenseWithPath(userId)} />}
    </>
  )
}

function ContactDetails({ contact }: { contact: ContactListItem }) {
  const activityQuery = useActivity(contact.person.id)
  const sharedActivity: SharedActivity = activityQuery.isPending
    ? 'loading'
    : activityQuery.data === undefined
      ? 'failed'
      : flattenActivityPages(activityQuery.data.pages).length > 0
        ? 'some'
        : 'none'

  return (
    <>
      <ContactHeader contact={contact} sharedActivity={sharedActivity} />
      <ContactActivity contact={contact} activityQuery={activityQuery} />
    </>
  )
}

/** Whether there is any activity with the contact, which tells settled up from never shared. */
type SharedActivity = 'loading' | 'failed' | 'none' | 'some'

type ContactHeaderProps = {
  contact: ContactListItem
  sharedActivity: SharedActivity
}

function ContactHeader({ contact, sharedActivity }: ContactHeaderProps) {
  const { person } = contact
  const secondaryLine = contactSecondaryLine(contact)

  return (
    <section aria-labelledby="contact-name" className="flex flex-col gap-4 border-b px-4 py-5">
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar id={person.id} name={person.displayName} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <h1 id="contact-name" className="max-w-full truncate text-xl font-semibold">
            {person.displayName}
          </h1>
          {secondaryLine !== '' && (
            <p className="max-w-full truncate text-[13px] text-muted-foreground">{secondaryLine}</p>
          )}
          {!contact.isRegistered && (
            <span className="mt-0.5 rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground/80">
              Not on Settle yet
            </span>
          )}
        </div>
      </div>
      <ContactBalance contact={contact} sharedActivity={sharedActivity} />
    </section>
  )
}

function ContactBalance({ contact, sharedActivity }: ContactHeaderProps) {
  const name = getShortName(contact.person.displayName)
  const balance = findPlnAmount(contact.balances)

  if (balance !== null) {
    const youOwe = isNegativeAmount(balance)
    return (
      <div className="flex items-end justify-between gap-3">
        <p className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm text-foreground/80">
            {youOwe ? `You owe ${name}` : `${name} owes you`}
          </span>
          <span
            className={cn(
              'text-[28px] leading-tight font-semibold whitespace-nowrap tabular-nums',
              youOwe ? 'text-negative' : 'text-positive',
            )}
          >
            {formatPln(balance)}
          </span>
        </p>
        <Link
          to={settleUpPath(contact.person.id, balance)}
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:bg-primary/85"
        >
          Settle up
        </Link>
      </div>
    )
  }

  // The view shows PLN only for now, so a balance in another currency must not read as settled.
  if (contact.balances.length > 0) {
    return <p className="text-[15px] text-muted-foreground">No PLN balance</p>
  }
  if (sharedActivity === 'loading') {
    return null
  }
  if (sharedActivity === 'failed') {
    return <p className="text-[15px] text-muted-foreground">No balance</p>
  }
  if (sharedActivity === 'none') {
    return <p className="text-[15px] text-muted-foreground">No shared expenses yet</p>
  }
  return (
    <p className="flex items-center gap-2 text-[15px] text-foreground/80">
      <CircleCheck className="size-5 shrink-0 text-positive" aria-hidden="true" />
      You and {name} are settled up
    </p>
  )
}

type ContactActivityProps = {
  contact: ContactListItem
  activityQuery: ReturnType<typeof useActivity>
}

function ContactActivity({ contact, activityQuery }: ContactActivityProps) {
  const { data: me } = useMe()
  const name = getShortName(contact.person.displayName)

  if (activityQuery.isPending) {
    return <ActivityRowsSkeleton />
  }
  if (activityQuery.data === undefined) {
    return (
      <StateMessage
        compact
        role="alert"
        icon={<CircleAlert className="size-7.5" aria-hidden="true" />}
        iconClassName="bg-destructive/10 text-destructive"
        title="Couldn't load activity"
        description="Check your connection and try again."
      >
        <Button
          variant="outline"
          className={pillClassName}
          onClick={() => activityQuery.refetch()}
          disabled={activityQuery.isFetching}
        >
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </StateMessage>
    )
  }

  const items = flattenActivityPages(activityQuery.data.pages)
  // Rows drop the year within the current one; following the last fetch relabels them on refetch.
  const now = new Date(activityQuery.dataUpdatedAt)
  if (items.length === 0) {
    return (
      <StateMessage
        compact
        icon={<Activity className="size-7.5" aria-hidden="true" />}
        title={`No expenses with ${name}`}
        description={
          contact.isRegistered
            ? `Expenses and payments with ${name} show up here.`
            : `Expenses you split with ${name} show up here. When ${name} signs up with this email, they'll see them too.`
        }
      />
    )
  }

  return (
    <section aria-label={`Activity with ${name}`}>
      <ul>
        {items.map((item) => (
          <li key={activityItemKey(item)}>
            <ActivityRow item={item} viewerId={me?.id ?? 0} lead="category" showDate now={now} />
          </li>
        ))}
      </ul>
      <ActivityListFooter
        hasNextPage={activityQuery.hasNextPage}
        isFetchingNextPage={activityQuery.isFetchingNextPage}
        isFetching={activityQuery.isFetching}
        isNextPageError={activityQuery.isFetchNextPageError}
        fetchNextPage={() => activityQuery.fetchNextPage({ cancelRefetch: false })}
      />
    </section>
  )
}

const skeletonRows = [
  ['48%', '40%'],
  ['62%', '46%'],
  ['40%', '52%'],
  ['56%', '38%'],
  ['44%', '48%'],
]

function ContactSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading contact</span>
      <div className="flex flex-col gap-4 border-b px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="size-11 shrink-0 motion-safe:animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4.5 w-40 motion-safe:animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-52 motion-safe:animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 motion-safe:animate-pulse rounded bg-muted" />
            <div className="h-7 w-36 motion-safe:animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-11 w-28 motion-safe:animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <SkeletonRows />
    </div>
  )
}

function ActivityRowsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading activity</span>
      <SkeletonRows />
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="pt-2">
      {skeletonRows.map(([titleWidth, sublineWidth]) => (
        <div key={titleWidth} className="flex min-h-17 items-center gap-3.5 px-4 py-2.5">
          <div className="size-11 shrink-0 motion-safe:animate-pulse rounded-tile bg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div
              className="h-3.5 motion-safe:animate-pulse rounded bg-muted"
              style={{ width: titleWidth }}
            />
            <div
              className="h-2.5 motion-safe:animate-pulse rounded bg-muted"
              style={{ width: sublineWidth }}
            />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="h-2.5 w-14 motion-safe:animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-19 motion-safe:animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
