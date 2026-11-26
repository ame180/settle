import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useLogin, useMe } from '@/api/auth'
import { useAppConfig } from '@/api/config'
import { ApiError } from '@/api/client'
import { AlertLine, FieldError } from '@/components/FieldError'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout, authLinkClassName } from './AuthLayout'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: () => t`Enter a valid email address` })),
  password: z.string().min(1, { error: () => t`Password is required` }),
})

type LoginValues = z.infer<typeof loginSchema>

export type LoginLocationState = { from?: string; email?: string } | null

export function LoginPage() {
  const { t } = useLingui()
  const { data: me } = useMe()
  const { data: config } = useAppConfig()
  const loginMutation = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState
  const redirectTo = locationState?.from ?? '/'

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: locationState?.email ?? '', password: '' },
  })
  const { errors } = form.formState

  if (me) {
    return <Navigate to={redirectTo} replace />
  }

  const onSubmit = form.handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: () => navigate(redirectTo, { replace: true }),
    })
  })

  const serverError = getLoginErrorMessage(loginMutation.error)

  return (
    <AuthLayout
      title={t`Sign in`}
      description={t`Use the email and password of your account.`}
      footer={
        config?.registrationEnabled && (
          <Trans>
            New to Settle?{' '}
            <Link to="/signup" className={authLinkClassName}>
              Create an account
            </Link>
          </Trans>
        )
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-email">
            <Trans>Email</Trans>
          </Label>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'signin-email-error' : undefined}
            {...form.register('email')}
          />
          {errors.email && <FieldError id="signin-email-error" message={errors.email.message} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-password">
            <Trans>Password</Trans>
          </Label>
          <Input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'signin-password-error' : undefined}
            {...form.register('password')}
          />
          {errors.password && (
            <FieldError id="signin-password-error" message={errors.password.message} />
          )}
        </div>
        {serverError && <AlertLine message={serverError} />}
        <PrimaryButton
          type="submit"
          pending={loginMutation.isPending}
          pendingLabel={t`Signing in…`}
          className="mt-2"
        >
          <Trans>Sign in</Trans>
        </PrimaryButton>
      </form>
    </AuthLayout>
  )
}

function getLoginErrorMessage(error: Error | null): string | null {
  if (error === null) {
    return null
  }
  if (error instanceof ApiError && error.status === 401) {
    return t`Invalid email or password.`
  }
  if (error instanceof ApiError && error.status === 429) {
    return t`Too many sign-in attempts. Wait a few minutes and try again.`
  }
  return t`Something went wrong. Please try again.`
}
