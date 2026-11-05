import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useMe, useUpdateMe } from '@/api/auth'
import { ApiError } from '@/api/client'
import { FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { SubmitButton } from '@/components/SubmitButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ProfileLocationState } from './ProfilePage'

const nameTooLongMessage = 'Use at most 64 characters.'

const editNameSchema = z.object({
  name: z.string().trim().max(64, nameTooLongMessage),
})

type EditNameValues = z.infer<typeof editNameSchema>

export function EditNamePage() {
  const { data: me } = useMe()
  // RequireAuth loads me first in the app; wait for it so the form starts with the current name.
  return me ? <EditNameForm currentName={me.name} /> : null
}

function EditNameForm({ currentName }: { currentName: string | null }) {
  const updateMeMutation = useUpdateMe()
  const navigate = useNavigate()

  const form = useForm<EditNameValues>({
    resolver: zodResolver(editNameSchema),
    defaultValues: { name: currentName ?? '' },
  })
  const { errors } = form.formState
  const isPending = updateMeMutation.isPending

  const onSubmit = form.handleSubmit((values) => {
    updateMeMutation.mutate(values, {
      onSuccess: () => {
        const state: ProfileLocationState = { nameSaved: true }
        navigate('/profile', { replace: true, state })
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 400) {
          form.setError('name', { message: nameTooLongMessage }, { shouldFocus: true })
          return
        }
        form.setError('root', { message: "Couldn't save your name. Try again." })
      },
    })
  })

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Your name"
        leading={
          <Link
            to="/profile"
            aria-label="Back to profile"
            className="flex size-11 items-center justify-center rounded-full hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Link>
        }
      />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <p className="text-[15px] leading-[1.45] text-muted-foreground">
          Contacts see this name instead of your email. A nickname they set for you still wins on
          their side.
        </p>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Name</Label>
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
                Leave empty to show your email.
              </p>
            )}
          </div>

          {errors.root && (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <SubmitButton isPending={isPending} pendingLabel="Saving…">
            Save name
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
