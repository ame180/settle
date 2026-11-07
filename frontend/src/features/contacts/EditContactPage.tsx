import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useContact, useUpdateContact } from '@/api/contacts'
import type { ContactListItem } from '@/api/types'
import { BackLink } from '@/components/BackLink'
import { AlertLine, FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { PersonAvatar } from '@/components/PersonAvatar'
import { LoadError } from '@/components/LoadError'
import { Spinner } from '@/components/Spinner'
import { SubmitButton } from '@/components/SubmitButton'
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
          <Spinner label="Loading contact" className="py-10" />
        ) : contact === undefined ? (
          <LoadError
            compact
            title="Couldn't load contact"
            onRetry={() => contactQuery.refetch()}
            isRetrying={contactQuery.isFetching}
          />
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
            <FieldError id="contact-nickname-error" message={errors.nickname.message} />
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

        {errors.root?.message && <AlertLine message={errors.root.message} />}

        <SubmitButton isPending={isPending} pendingLabel="Saving…">
          Save
        </SubmitButton>
      </form>
    </div>
  )
}
