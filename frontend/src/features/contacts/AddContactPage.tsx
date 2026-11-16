import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useAddContact } from '@/api/contacts'
import { ApiError } from '@/api/client'
import { BackLink } from '@/components/BackLink'
import { AlertLine, FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGoBack } from '@/lib/useGoBack'
import { cn } from '@/lib/utils'

const addContactSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: () => t`Enter a valid email address.` })),
  nickname: z
    .string()
    .trim()
    .max(64, { error: () => t`Nickname can be at most 64 characters.` }),
})

type AddContactValues = z.infer<typeof addContactSchema>

const formFields = ['email', 'nickname'] as const

function isFormField(propertyPath: string): propertyPath is (typeof formFields)[number] {
  return (formFields as readonly string[]).includes(propertyPath)
}

export function AddContactPage() {
  const { t } = useLingui()
  const addContactMutation = useAddContact()
  const { goBack } = useGoBack('/')

  const form = useForm<AddContactValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: { email: '', nickname: '' },
  })
  const { errors } = form.formState
  const isPending = addContactMutation.isPending

  const onSubmit = form.handleSubmit((values) => {
    addContactMutation.mutate(
      { email: values.email, nickname: values.nickname === '' ? null : values.nickname },
      {
        onSuccess: (contact) => {
          const displayName = contact.person.displayName
          toast.success(t`${displayName} added to your contacts`)
          goBack()
        },
        onError: (error) => {
          if (!(error instanceof ApiError) || error.status !== 400) {
            form.setError('root', { message: t`Couldn't add contact. Try again.` })
            return
          }

          const fieldViolations = error.violations.filter((violation) =>
            isFormField(violation.propertyPath),
          )
          // A 400 without violations is the API refusing your own email.
          if (fieldViolations.length === 0) {
            form.setError('email', { message: t`You can’t add yourself as a contact.` })
            return
          }
          for (const violation of fieldViolations) {
            if (isFormField(violation.propertyPath)) {
              form.setError(violation.propertyPath, { message: violation.title })
            }
          }
        },
      },
    )
  })

  const inputClassName = cn(isPending && 'border-border bg-muted text-muted-foreground')

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t`Add contact`}
        leading={<BackLink to="/" label={t`Back to contacts`} />}
      />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <p className="text-[15px] text-muted-foreground">
          <Trans>
            Not on Settle yet? They can claim their account later by signing up with this email.
          </Trans>
        </p>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-email">
              <Trans>Email</Trans>
            </Label>
            <Input
              id="contact-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              readOnly={isPending}
              className={inputClassName}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
              {...form.register('email')}
            />
            {errors.email && <FieldError id="contact-email-error" message={errors.email.message} />}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-nickname">
              <Trans>
                Nickname <span className="font-normal text-muted-foreground">(optional)</span>
              </Trans>
            </Label>
            <Input
              id="contact-nickname"
              placeholder={t`e.g. Jan`}
              readOnly={isPending}
              className={inputClassName}
              aria-invalid={!!errors.nickname}
              aria-describedby={
                errors.nickname ? 'contact-nickname-error' : 'contact-nickname-hint'
              }
              {...form.register('nickname')}
            />
            {errors.nickname ? (
              <FieldError id="contact-nickname-error" message={errors.nickname.message} />
            ) : (
              <p id="contact-nickname-hint" className="text-[13px] text-muted-foreground">
                <Trans>Only you see this name.</Trans>
              </p>
            )}
          </div>

          {errors.root?.message && <AlertLine message={errors.root.message} />}

          <PrimaryButton
            type="submit"
            pending={isPending}
            pendingLabel={t`Adding…`}
            className="mt-2"
          >
            <Trans>Add contact</Trans>
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
