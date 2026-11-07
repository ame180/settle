import { Link } from 'react-router'
import { UserX } from 'lucide-react'
import { BackLink } from '@/components/BackLink'
import { PageHeader } from '@/components/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { buttonClassName } from '@/components/ui/button-variants'

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
      <Link to="/" className={buttonClassName({ variant: 'outline', size: 'pill' })}>
        Go to contacts
      </Link>
    </StateMessage>
  )
}
