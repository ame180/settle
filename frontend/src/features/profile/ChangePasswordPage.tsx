import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useChangePassword, useMe } from '@/api/auth'
import { ApiError } from '@/api/client'
import { BackLink } from '@/components/BackLink'
import { AlertLine, FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { useGoBack } from '@/lib/useGoBack'
import { cn } from '@/lib/utils'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: () => t`Enter your current password.` }),
    newPassword: z
      .string()
      .min(8, { error: () => t`Use at least 8 characters.` })
      .max(64, { error: () => t`Use at most 64 characters.` }),
    repeatPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.repeatPassword, {
    path: ['repeatPassword'],
    error: () => t`The passwords don't match.`,
  })

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export function ChangePasswordPage() {
  const { t } = useLingui()
  const { data: me } = useMe()
  const changePasswordMutation = useChangePassword()
  const { goBack } = useGoBack('/profile')

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', repeatPassword: '' },
  })
  const { errors } = form.formState
  const isPending = changePasswordMutation.isPending

  const onSubmit = form.handleSubmit(({ currentPassword, newPassword }) => {
    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success(t`Password changed`)
          goBack()
        },
        onError: (error) => {
          const violatedFields =
            error instanceof ApiError
              ? error.violations.map((violation) => violation.propertyPath)
              : []
          if (violatedFields.includes('currentPassword')) {
            form.setError(
              'currentPassword',
              { message: t`That isn't your current password.` },
              { shouldFocus: true },
            )
            return
          }
          if (violatedFields.includes('newPassword')) {
            form.setError(
              'newPassword',
              { message: t`Use 8 to 64 characters.` },
              { shouldFocus: true },
            )
            return
          }
          if (error instanceof ApiError && error.status === 429) {
            form.setError('root', { message: t`Too many attempts. Try again later.` })
            return
          }
          form.setError('root', { message: t`Couldn't change your password. Try again.` })
        },
      },
    )
  })

  const inputClassName = cn(isPending && 'border-border bg-muted text-muted-foreground')

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t`Change password`}
        leading={<BackLink to="/profile" label={t`Back to profile`} />}
      />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <p className="text-[15px] leading-[1.45] text-muted-foreground">
          <Trans>You stay signed in here. Other devices will be signed out.</Trans>
        </p>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {/* Tells password managers which saved login to update. */}
          <input type="email" autoComplete="username" value={me?.email ?? ''} readOnly hidden />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-password">
              <Trans>Current password</Trans>
            </Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              autoFocus
              readOnly={isPending}
              className={inputClassName}
              aria-invalid={!!errors.currentPassword}
              aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
              {...form.register('currentPassword')}
            />
            {errors.currentPassword && (
              <FieldError id="current-password-error" message={errors.currentPassword.message} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">
              <Trans>New password</Trans>
            </Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              readOnly={isPending}
              className={inputClassName}
              aria-invalid={!!errors.newPassword}
              aria-describedby={errors.newPassword ? 'new-password-error' : 'new-password-hint'}
              {...form.register('newPassword')}
            />
            {errors.newPassword ? (
              <FieldError id="new-password-error" message={errors.newPassword.message} />
            ) : (
              <p id="new-password-hint" className="text-[13px] text-muted-foreground">
                <Trans>8 to 64 characters.</Trans>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repeat-password">
              <Trans>Repeat new password</Trans>
            </Label>
            <PasswordInput
              id="repeat-password"
              autoComplete="new-password"
              readOnly={isPending}
              className={inputClassName}
              aria-invalid={!!errors.repeatPassword}
              aria-describedby={errors.repeatPassword ? 'repeat-password-error' : undefined}
              {...form.register('repeatPassword')}
            />
            {errors.repeatPassword && (
              <FieldError id="repeat-password-error" message={errors.repeatPassword.message} />
            )}
          </div>

          {errors.root?.message && <AlertLine message={errors.root.message} />}

          <PrimaryButton
            type="submit"
            pending={isPending}
            pendingLabel={t`Saving…`}
            className="mt-2"
          >
            <Trans>Save password</Trans>
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
