import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useLogin, useMe } from '@/api/auth'
import { ApiError } from '@/api/client'
import { FieldError } from '@/components/FieldError'
import { SubmitButton } from '@/components/SubmitButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout, authLinkClassName } from './AuthLayout'

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

export type LoginLocationState = { from?: string; email?: string } | null

export function LoginPage() {
  const { data: me } = useMe()
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

  const serverError =
    loginMutation.error instanceof ApiError && loginMutation.error.status === 401
      ? 'Invalid email or password.'
      : loginMutation.error
        ? 'Something went wrong. Please try again.'
        : null

  return (
    <AuthLayout
      title="Sign in"
      description="Use the email and password of your account."
      footer={
        <>
          New to Settle?{' '}
          <Link to="/signup" className={authLinkClassName}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-email">Email</Label>
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
          <Label htmlFor="signin-password">Password</Label>
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
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <SubmitButton isPending={loginMutation.isPending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
