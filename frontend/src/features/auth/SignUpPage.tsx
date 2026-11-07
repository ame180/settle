import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate } from 'react-router'
import { useMe, useRegister } from '@/api/auth'
import { ApiError } from '@/api/client'
import { AlertLine, FieldError } from '@/components/FieldError'
import { SubmitButton } from '@/components/SubmitButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AuthLayout, authLinkClassName } from './AuthLayout'
import type { LoginLocationState } from './LoginPage'
import { PasswordInput } from './PasswordInput'

const fieldMessages = {
  name: 'Use at most 64 characters.',
  email: 'Enter a valid email address.',
  password: 'Use 8 to 64 characters.',
} as const

const signUpSchema = z.object({
  name: z.string().trim().max(64, fieldMessages.name),
  email: z.string().trim().pipe(z.email(fieldMessages.email)),
  password: z.string().min(8, 'Use at least 8 characters.').max(64, 'Use at most 64 characters.'),
})

type SignUpValues = z.infer<typeof signUpSchema>
type SignUpField = keyof typeof fieldMessages

const emailTakenMessage = 'An account with this email already exists.'

function isSignUpField(propertyPath: string): propertyPath is SignUpField {
  return propertyPath in fieldMessages
}

export function SignUpPage() {
  const { data: me } = useMe()
  const registerMutation = useRegister()
  const navigate = useNavigate()

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const { errors } = form.formState
  const isPending = registerMutation.isPending
  const isEmailTaken = errors.email?.type === 'taken'

  if (me) {
    return <Navigate to="/" replace />
  }

  const onSubmit = form.handleSubmit((values) => {
    registerMutation.mutate(
      { email: values.email, password: values.password, name: values.name || null },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (error) => {
          if (!(error instanceof ApiError)) {
            form.setError('root', { message: "Couldn't create your account. Try again." })
            return
          }
          if (error.status === 409) {
            form.setError(
              'email',
              { type: 'taken', message: emailTakenMessage },
              { shouldFocus: true },
            )
            return
          }
          if (error.status === 429) {
            form.setError('root', {
              message: 'Too many sign-up attempts from this network. Try again later.',
            })
            return
          }

          const fields = error.violations
            .map((violation) => violation.propertyPath)
            .filter(isSignUpField)
          if ((error.status !== 400 && error.status !== 422) || fields.length === 0) {
            form.setError('root', { message: "Couldn't create your account. Try again." })
            return
          }
          for (const [index, field] of fields.entries()) {
            form.setError(field, { message: fieldMessages[field] }, { shouldFocus: index === 0 })
          }
        },
      },
    )
  })

  const inputClassName = cn(isPending && 'border-border bg-muted text-muted-foreground')
  const loginState: LoginLocationState = { email: form.getValues('email').trim() }

  return (
    <AuthLayout
      title="Create an account"
      description="Someone already added you? Sign up with that same email and your shared expenses will be waiting."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className={authLinkClassName}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder="e.g. Ame"
            readOnly={isPending}
            className={inputClassName}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'signup-name-error' : 'signup-name-hint'}
            {...form.register('name')}
          />
          {errors.name ? (
            <FieldError id="signup-name-error" message={errors.name.message} />
          ) : (
            <p id="signup-name-hint" className="text-[13px] text-muted-foreground">
              Shown to your contacts instead of your email.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            readOnly={isPending}
            className={inputClassName}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
            {...form.register('email')}
          />
          {errors.email && <FieldError id="signup-email-error" message={errors.email.message} />}
          {isEmailTaken && (
            <Link
              to="/login"
              state={loginState}
              className={cn(authLinkClassName, 'self-start text-[13px]')}
            >
              Sign in instead
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            readOnly={isPending}
            className={inputClassName}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-hint'}
            {...form.register('password')}
          />
          {errors.password ? (
            <FieldError id="signup-password-error" message={errors.password.message} />
          ) : (
            <p id="signup-password-hint" className="text-[13px] text-muted-foreground">
              8 to 64 characters.
            </p>
          )}
        </div>

        {errors.root?.message && <AlertLine message={errors.root.message} />}

        <SubmitButton isPending={isPending} pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
