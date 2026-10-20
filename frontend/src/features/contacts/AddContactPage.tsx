import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, CircleAlert, LoaderCircle } from 'lucide-react'
import { useAddContact } from '@/api/contacts'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ContactsLocationState } from './ContactsPage'

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
  const navigate = useNavigate()

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
          const state: ContactsLocationState = { addedContactName: contact.person.displayName }
          navigate('/', { replace: true, state })
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
      <PageHeader
        title="Add contact"
        leading={
          <Link
            to="/"
            aria-label="Back to contacts"
            className="flex size-11 items-center justify-center rounded-full hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Link>
        }
      />

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
                Adding…
              </>
            ) : (
              'Add contact'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-[13px] text-destructive">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}
