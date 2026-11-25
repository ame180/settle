import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useMe, useUpdateMe } from '@/api/auth'
import { ApiError } from '@/api/client'
import { BackLink } from '@/components/BackLink'
import { AlertLine, FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGoBack } from '@/lib/useGoBack'
import { cn } from '@/lib/utils'

const nameTooLongMessage = () => t`Use at most 64 characters.`

const editNameSchema = z.object({
  name: z.string().trim().max(64, { error: nameTooLongMessage }),
})

type EditNameValues = z.infer<typeof editNameSchema>

export function EditNamePage() {
  const { data: me } = useMe()
  // RequireAuth loads me first in the app; wait for it so the form starts with the current name.
  return me ? <EditNameForm currentName={me.name} /> : null
}

function EditNameForm({ currentName }: { currentName: string | null }) {
  const { t } = useLingui()
  const updateMeMutation = useUpdateMe()
  const { goBack } = useGoBack('/profile')

  const form = useForm<EditNameValues>({
    resolver: zodResolver(editNameSchema),
    defaultValues: { name: currentName ?? '' },
  })
  const { errors } = form.formState
  const isPending = updateMeMutation.isPending

  const onSubmit = form.handleSubmit((values) => {
    updateMeMutation.mutate(values, {
      onSuccess: () => {
        toast.success(t`Name saved`)
        goBack()
      },
      onError: (error) => {
        const isNameViolation =
          error instanceof ApiError &&
          error.violations.some((violation) => violation.propertyPath === 'name')
        if (isNameViolation) {
          form.setError('name', { message: nameTooLongMessage() }, { shouldFocus: true })
          return
        }
        form.setError('root', { message: t`Couldn't save your name. Try again.` })
      },
    })
  })

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t`Your name`}
        leading={<BackLink to="/profile" label={t`Back to profile`} />}
      />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <p className="text-[15px] leading-[1.45] text-muted-foreground">
          <Trans>
            Contacts see this name instead of your email. A nickname they set for you still wins on
            their side.
          </Trans>
        </p>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">
              <Trans>Name</Trans>
            </Label>
            <Input
              id="profile-name"
              autoComplete="name"
              autoFocus
              readOnly={isPending}
              className={cn(isPending && 'border-border bg-muted text-muted-foreground')}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'profile-name-error' : 'profile-name-hint'}
              {...form.register('name')}
            />
            {errors.name ? (
              <FieldError id="profile-name-error" message={errors.name.message} />
            ) : (
              <p id="profile-name-hint" className="text-[13px] text-muted-foreground">
                <Trans>Leave empty to show your email.</Trans>
              </p>
            )}
          </div>

          {errors.root?.message && <AlertLine message={errors.root.message} />}

          <PrimaryButton
            type="submit"
            pending={isPending}
            pendingLabel={t`Saving…`}
            className="mt-2"
          >
            <Trans>Save name</Trans>
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
