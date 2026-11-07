import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams } from 'react-router'
import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useContact, useUpdateContact } from '@/api/contacts'
import type { ContactListItem } from '@/api/types'
import { BackLink } from '@/components/BackLink'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getShortName } from '@/lib/person'
import { useGoBack } from '@/lib/useGoBack'
import { cn } from '@/lib/utils'
import { ContactNotFound } from './ContactNotFound'
import { parseUserId } from '@/lib/parseUserId'

const editContactSchema = z.object({
  nickname: z.string().trim().max(64, 'Nickname can be at most 64 characters.'),
})

type EditContactValues = z.infer<typeof editContactSchema>

export function EditContactPage() {
  const userId = parseUserId(useParams().userId)

  return userId === null ? <ContactNotFound /> : <EditContact userId={userId} />
}

function EditContact({ userId }: { userId: number }) {
  const contactQuery = useContact(userId)
  const contact = contactQuery.data

  if (contact === null) {
    return <ContactNotFound />
  }

  const backLabel = contact ? `Back to ${getShortName(contact.person.displayName)}` : 'Back'

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Edit contact"
        leading={<BackLink to={`/contacts/${userId}`} label={backLabel} />}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {contactQuery.isPending ? (
          <div role="status" className="flex justify-center py-10 text-muted-foreground">
            <LoaderCircle className="size-6 motion-safe:animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading contact</span>
          </div>
        ) : contact === undefined ? (
          <StateMessage
            compact
            role="alert"
            icon={<CircleAlert className="size-7.5" aria-hidden="true" />}
            iconClassName="bg-destructive/10 text-destructive"
            title="Couldn't load contact"
            description="Check your connection and try again."
          >
            <Button
              variant="outline"
              className="rounded-full px-5 text-[15px]"
              onClick={() => contactQuery.refetch()}
              disabled={contactQuery.isFetching}
            >
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          </StateMessage>
        ) : (
          <EditContactForm contact={contact} />
        )}
      </div>
    </div>
  )
}

function EditContactForm({ contact }: { contact: ContactListItem }) {
  const { person } = contact
  const updateContactMutation = useUpdateContact(person.id)
  const { goBack } = useGoBack(`/contacts/${person.id}`)

  const form = useForm<EditContactValues>({
    resolver: zodResolver(editContactSchema),
    defaultValues: { nickname: contact.nickname ?? '' },
  })
  const { errors } = form.formState
  const isPending = updateContactMutation.isPending

  const onSubmit = form.handleSubmit((values) => {
    updateContactMutation.mutate(
      { nickname: values.nickname === '' ? null : values.nickname },
      {
        onSuccess: () => {
          toast.success('Contact saved')
          goBack()
        },
        onError: (error) => {
          const nicknameViolation =
            error instanceof ApiError && error.status === 400
              ? error.violations.find((violation) => violation.propertyPath === 'nickname')
              : undefined
          if (nicknameViolation) {
            form.setError('nickname', { message: nicknameViolation.title })
            return
          }
          form.setError('root', { message: "Couldn't save. Try again." })
        },
      },
    )
  })

  const ownName = contact.name ?? person.email

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 items-center gap-3.5">
        <PersonAvatar id={person.id} name={person.displayName} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-semibold">{ownName}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            {contact.name === null ? 'No name on Settle yet' : 'Their name on Settle'}
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-nickname">
            Nickname <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="contact-nickname"
            autoComplete="off"
            readOnly={isPending}
            className={cn(isPending && 'border-border bg-muted text-muted-foreground')}
            aria-invalid={!!errors.nickname}
            aria-describedby={errors.nickname ? 'contact-nickname-error' : 'contact-nickname-hint'}
            {...form.register('nickname')}
          />
          {errors.nickname ? (
            <p
              id="contact-nickname-error"
              className="flex items-center gap-1.5 text-[13px] text-destructive"
            >
              <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
              {errors.nickname.message}
            </p>
          ) : (
            <p id="contact-nickname-hint" className="text-[13px] text-muted-foreground">
              Only you see this. Leave empty to use their name.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={person.email}
            readOnly
            className="border-border bg-muted text-muted-foreground"
          />
        </div>

        {errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          className="mt-2 h-12 rounded-full text-base font-semibold disabled:opacity-75 [&_svg]:size-4.5"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            'Save'
          )}
        </Button>
      </form>
    </div>
  )
}
