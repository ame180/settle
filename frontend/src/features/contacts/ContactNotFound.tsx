import { Link } from 'react-router'
import { UserX } from 'lucide-react'
import { BackLink } from '@/components/BackLink'
import { PageHeader } from '@/components/PageHeader'
import { StateMessage } from '@/components/StateMessage'

export function ContactNotFound() {
  return (
    <>
      <PageHeader leading={<BackLink to="/" label="Back to contacts" />} />
      <ContactNotFoundMessage />
    </>
  )
}

export function ContactNotFoundMessage() {
  return (
    <StateMessage
      icon={<UserX className="size-7.5" aria-hidden="true" />}
      title="Contact not found"
      description="They may not be one of your contacts."
    >
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-full border border-input bg-background px-5 text-[15px] font-medium hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Go to contacts
      </Link>
    </StateMessage>
  )
}
