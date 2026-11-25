import { Link } from 'react-router'
import { UserX } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { BackLink } from '@/components/BackLink'
import { PageHeader } from '@/components/PageHeader'
import { StateMessage } from '@/components/StateMessage'
import { buttonClassName } from '@/components/ui/button-variants'

export function ContactNotFound({ title }: { title?: string } = {}) {
  const { t } = useLingui()
  return (
    <>
      <PageHeader
        title={title ?? t`Contact`}
        leading={<BackLink to="/" label={t`Back to contacts`} />}
      />
      <ContactNotFoundMessage />
    </>
  )
}

export function ContactNotFoundMessage() {
  const { t } = useLingui()
  return (
    <StateMessage
      icon={<UserX className="size-7.5" aria-hidden="true" />}
      title={t`Contact not found`}
      description={t`They may not be one of your contacts.`}
    >
      <Link to="/" className={buttonClassName({ variant: 'outline', size: 'pill' })}>
        <Trans>Go to contacts</Trans>
      </Link>
    </StateMessage>
  )
}
