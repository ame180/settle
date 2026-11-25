import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link, Navigate, useNavigate } from 'react-router'
import { useMe, useRegister } from '@/api/auth'
import { useAppConfig } from '@/api/config'
import { ApiError } from '@/api/client'
import { AlertLine, FieldError } from '@/components/FieldError'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Input } from '@/components/ui/input'
import { buttonClassName } from '@/components/ui/button-variants'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AuthLayout, authLinkClassName } from './AuthLayout'
import type { LoginLocationState } from './LoginPage'
import { PasswordInput } from './PasswordInput'

const fieldMessages = {
  name: () => t`Use at most 64 characters.`,
  email: () => t`Enter a valid email address.`,
  password: () => t`Use 8 to 64 characters.`,
}

const signUpSchema = z.object({
  name: z.string().trim().max(64, { error: fieldMessages.name }),
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: fieldMessages.email })),
  password: z
    .string()
    .min(8, { error: () => t`Use at least 8 characters.` })
    .max(64, { error: () => t`Use at most 64 characters.` }),
})

type SignUpValues = z.infer<typeof signUpSchema>
type SignUpField = keyof typeof fieldMessages

function isSignUpField(propertyPath: string): propertyPath is SignUpField {
  return propertyPath in fieldMessages
}

export function SignUpPage() {
  const { data: me } = useMe()
  const { data: config, isPending } = useAppConfig()

  if (me) {
    return <Navigate to="/" replace />
  }
  if (isPending) {
    return null
  }
  // If the config can't load, show the form anyway: the server still refuses a closed sign-up.
  return config?.registrationEnabled === false ? <SignUpClosed /> : <SignUpForm />
}

function SignUpClosed() {
  const { t } = useLingui()
  return (
    <AuthLayout
      title={t`Sign-up is closed`}
      description={t`New accounts are by invitation only. Ask the person who runs this Settle to create one for you.`}
    >
      <Link
        to="/login"
        className={buttonClassName({
          size: 'lg',
          className: 'w-full rounded-full text-base font-semibold',
        })}
      >
        <Trans>Go to sign in</Trans>
      </Link>
    </AuthLayout>
  )
}

function SignUpForm() {
  const { t } = useLingui()
  const registerMutation = useRegister()
  const navigate = useNavigate()

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const { errors } = form.formState
  const isPending = registerMutation.isPending
  const isEmailTaken = errors.email?.type === 'taken'

  const onSubmit = form.handleSubmit((values) => {
    registerMutation.mutate(
      { email: values.email, password: values.password, name: values.name || null },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (error) => {
          if (!(error instanceof ApiError)) {
            form.setError('root', { message: t`Couldn't create your account. Try again.` })
            return
          }
          if (error.status === 409) {
            form.setError(
              'email',
              { type: 'taken', message: t`An account with this email already exists.` },
              { shouldFocus: true },
            )
            return
          }
          if (error.status === 403) {
            form.setError('root', { message: t`Sign-up is closed.` })
            return
          }
          if (error.status === 429) {
            form.setError('root', {
              message: t`Too many sign-up attempts from this network. Try again later.`,
            })
            return
          }

          const fields = error.violations
            .map((violation) => violation.propertyPath)
            .filter(isSignUpField)
          if ((error.status !== 400 && error.status !== 422) || fields.length === 0) {
            form.setError('root', { message: t`Couldn't create your account. Try again.` })
            return
          }
          for (const [index, field] of fields.entries()) {
            form.setError(field, { message: fieldMessages[field]() }, { shouldFocus: index === 0 })
          }
        },
      },
    )
  })

  const inputClassName = cn(isPending && 'border-border bg-muted text-muted-foreground')
  const loginState: LoginLocationState = { email: form.getValues('email').trim() }

  return (
    <AuthLayout
      title={t`Create an account`}
      description={t`Someone already added you? Sign up with that same email and your shared expenses will be waiting.`}
      footer={
        <Trans>
          Already have an account?{' '}
          <Link to="/login" className={authLinkClassName}>
            Sign in
          </Link>
        </Trans>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">
            <Trans>
              Name <span className="font-normal text-muted-foreground">(optional)</span>
            </Trans>
          </Label>
          <Input
            id="signup-name"
            autoComplete="name"
            placeholder={t`e.g. Ame`}
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
              <Trans>Shown to your contacts instead of your email.</Trans>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">
            <Trans>Email</Trans>
          </Label>
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
              <Trans>Sign in instead</Trans>
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">
            <Trans>Password</Trans>
          </Label>
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
              <Trans>8 to 64 characters.</Trans>
            </p>
          )}
        </div>

        {errors.root?.message && <AlertLine message={errors.root.message} />}

        <PrimaryButton
          type="submit"
          pending={isPending}
          pendingLabel={t`Creating account…`}
          className="mt-2"
        >
          <Trans>Create account</Trans>
        </PrimaryButton>
      </form>
    </AuthLayout>
  )
}
