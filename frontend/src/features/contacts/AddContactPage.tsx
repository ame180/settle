import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAddContact } from '@/api/contacts'
import { ApiError } from '@/api/client'
import { BackLink } from '@/components/BackLink'
import { AlertLine, FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { SubmitButton } from '@/components/SubmitButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGoBack } from '@/lib/useGoBack'
import { cn } from '@/lib/utils'

const addContactSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
  nickname: z.string().trim().max(64, 'Nickname can be at most 64 characters.'),
})

type AddContactValues = z.infer<typeof addContactSchema>

const formFields = ['email', 'nickname'] as const

function isFormField(propertyPath: string): propertyPath is (typeof formFields)[number] {
  return (formFields as readonly string[]).includes(propertyPath)
}

export function AddContactPage() {
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
          toast.success(`${contact.person.displayName} added to your contacts`)
          goBack()
        },
        onError: (error) => {
          if (!(error instanceof ApiError) || error.status !== 400) {
            form.setError('root', { message: "Couldn't add contact. Try again." })
            return
          }

          const fieldViolations = error.violations.filter((violation) =>
            isFormField(violation.propertyPath),
          )
          if (fieldViolations.length === 0) {
            form.setError('email', { message: error.message })
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
      <PageHeader title="Add contact" leading={<BackLink to="/" label="Back to contacts" />} />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <p className="text-[15px] text-muted-foreground">
          Not on Settle yet? They can claim their account later by signing up with this email.
        </p>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-email">Email</Label>
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
              Nickname <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="contact-nickname"
              placeholder="e.g. Jan"
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
                Only you see this name.
              </p>
            )}
          </div>

          {errors.root?.message && <AlertLine message={errors.root.message} />}

          <SubmitButton isPending={isPending} pendingLabel="Adding…">
            Add contact
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
